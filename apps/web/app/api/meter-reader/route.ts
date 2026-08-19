import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/server-session";
export const runtime = "nodejs";
type ReaderInput = { employeeId: string; code: string; isActive: boolean };
function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function fail(message: string, status: number) {
  return Response.json({ success: false, message }, { status });
}
function duplicateError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
function parseReader(
  body: Record<string, unknown>,
): { reader: ReaderInput } | { error: string } {
  const employeeId = text(body.employee_id);
  const code = text(body.reader_code);
  if (!employeeId) return { error: "Employee is required." };
  if (!/^\d+$/.test(employeeId))
    return { error: "Selected employee does not exist." };
  if (!code) return { error: "Reader Code is required." };
  return {
    reader: {
      employeeId,
      code: code.toUpperCase(),
      isActive: typeof body.is_active === "boolean" ? body.is_active : true,
    },
  };
}
async function employeeExists(client: Pick<typeof db, "query">, id: string) {
  const result = await client.query(
    "SELECT employee_id FROM public.mt_employee WHERE employee_id=$1 LIMIT 1",
    [id],
  );
  return (result.rowCount ?? 0) > 0;
}
export async function GET() {
  const auth = await requireSessionUser();
  if (auth.response) return auth.response;
  try {
    const result = await db.query(
      "SELECT r.meter_reader_id, r.employee_id, r.reader_code, r.is_active, e.employee_code, e.employee_name FROM public.mt_meter_reader r JOIN public.mt_employee e ON e.employee_id=r.employee_id ORDER BY r.reader_code ASC",
    );
    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Failed to load meter readers:", error);
    return fail("Unable to load meter readers.", 500);
  }
}
export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if (auth.response) return auth.response;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request.", 400);
  }
  const parsed = parseReader(body);
  if ("error" in parsed) return fail(parsed.error ?? "Invalid request.", 400);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    if (!(await employeeExists(client, parsed.reader.employeeId))) {
      await client.query("ROLLBACK");
      return fail("Selected employee does not exist.", 400);
    }
    const duplicate = await client.query(
      "SELECT meter_reader_id FROM public.mt_meter_reader WHERE reader_code=$1 LIMIT 1",
      [parsed.reader.code],
    );
    if ((duplicate.rowCount ?? 0) > 0) {
      await client.query("ROLLBACK");
      return fail("Reader Code already exists.", 409);
    }
    const result = await client.query(
      "INSERT INTO public.mt_meter_reader (employee_id,reader_code,is_active,created_by) VALUES ($1,$2,$3,$4) RETURNING meter_reader_id,employee_id,reader_code,is_active",
      [
        parsed.reader.employeeId,
        parsed.reader.code,
        parsed.reader.isActive,
        auth.user.userId,
      ],
    );
    await client.query("COMMIT");
    return Response.json(
      {
        success: true,
        message: "Meter reader saved successfully.",
        data: result.rows[0],
      },
      { status: 201 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to save meter reader:", error);
    return fail(
      duplicateError(error)
        ? "Reader Code already exists."
        : "The meter reader could not be saved.",
      duplicateError(error) ? 409 : 500,
    );
  } finally {
    client.release();
  }
}
export async function PUT(request: Request) {
  const auth = await requireSessionUser();
  if (auth.response) return auth.response;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request.", 400);
  }
  const id = text(body.meter_reader_id);
  const parsed = parseReader(body);
  if (!/^\d+$/.test(id)) return fail("Meter Reader ID is required.", 400);
  if ("error" in parsed) return fail(parsed.error ?? "Invalid request.", 400);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT meter_reader_id FROM public.mt_meter_reader WHERE meter_reader_id=$1 LIMIT 1",
      [id],
    );
    if ((existing.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      return fail("Meter reader not found.", 404);
    }
    if (!(await employeeExists(client, parsed.reader.employeeId))) {
      await client.query("ROLLBACK");
      return fail("Selected employee does not exist.", 400);
    }
    const duplicate = await client.query(
      "SELECT meter_reader_id FROM public.mt_meter_reader WHERE reader_code=$1 AND meter_reader_id<>$2 LIMIT 1",
      [parsed.reader.code, id],
    );
    if ((duplicate.rowCount ?? 0) > 0) {
      await client.query("ROLLBACK");
      return fail("Reader Code already exists.", 409);
    }
    const result = await client.query(
      "UPDATE public.mt_meter_reader SET employee_id=$1,reader_code=$2,is_active=$3,updated_by=$4,updated_at=CURRENT_TIMESTAMP WHERE meter_reader_id=$5 RETURNING meter_reader_id,employee_id,reader_code,is_active",
      [
        parsed.reader.employeeId,
        parsed.reader.code,
        parsed.reader.isActive,
        auth.user.userId,
        id,
      ],
    );
    await client.query("COMMIT");
    return Response.json({
      success: true,
      message: "Meter reader updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to update meter reader:", error);
    return fail(
      duplicateError(error)
        ? "Reader Code already exists."
        : "The meter reader could not be updated.",
      duplicateError(error) ? 409 : 500,
    );
  } finally {
    client.release();
  }
}
