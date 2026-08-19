import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/server-session";
export const runtime = "nodejs";
type EmployeeInput = {
  code: string;
  name: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  position: string | null;
  contactNo: string | null;
  email: string | null;
  isActive: boolean;
};
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
function parseEmployee(
  body: Record<string, unknown>,
): { employee: EmployeeInput } | { error: string } {
  const code = text(body.employee_code);
  const name = text(body.employee_name);
  const email = text(body.email);
  if (!code) return { error: "Employee Code is required." };
  if (!name) return { error: "Employee Name is required." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "Please enter a valid email address." };
  return {
    employee: {
      code: code.toUpperCase(),
      name,
      firstName: text(body.first_name) || null,
      middleName: text(body.middle_name) || null,
      lastName: text(body.last_name) || null,
      position: text(body.position) || null,
      contactNo: text(body.contact_no) || null,
      email: email || null,
      isActive: typeof body.is_active === "boolean" ? body.is_active : true,
    },
  };
}
export async function GET() {
  const auth = await requireSessionUser();
  if (auth.response) return auth.response;
  try {
    const result = await db.query(
      "SELECT employee_id, employee_code, first_name, middle_name, last_name, employee_name, position, contact_no, email, is_active FROM public.mt_employee ORDER BY employee_code ASC",
    );
    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Failed to load employees:", error);
    return fail("Unable to load employees.", 500);
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
  const parsed = parseEmployee(body);
  if ("error" in parsed) return fail(parsed.error ?? "Invalid request.", 400);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const duplicate = await client.query(
      "SELECT employee_id FROM public.mt_employee WHERE employee_code = $1 LIMIT 1",
      [parsed.employee.code],
    );
    if ((duplicate.rowCount ?? 0) > 0) {
      await client.query("ROLLBACK");
      return fail("Employee Code already exists.", 409);
    }
    const e = parsed.employee;
    const result = await client.query(
      "INSERT INTO public.mt_employee (employee_code, first_name, middle_name, last_name, employee_name, position, contact_no, email, is_active, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING employee_id, employee_code, first_name, middle_name, last_name, employee_name, position, contact_no, email, is_active",
      [
        e.code,
        e.firstName,
        e.middleName,
        e.lastName,
        e.name,
        e.position,
        e.contactNo,
        e.email,
        e.isActive,
        auth.user.userId,
      ],
    );
    await client.query("COMMIT");
    return Response.json(
      {
        success: true,
        message: "Employee saved successfully.",
        data: result.rows[0],
      },
      { status: 201 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to save employee:", error);
    return fail(
      duplicateError(error)
        ? "Employee Code already exists."
        : "The employee could not be saved.",
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
  const id = text(body.employee_id);
  const parsed = parseEmployee(body);
  if (!/^\d+$/.test(id)) return fail("Employee ID is required.", 400);
  if ("error" in parsed) return fail(parsed.error ?? "Invalid request.", 400);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT employee_id FROM public.mt_employee WHERE employee_id = $1 LIMIT 1",
      [id],
    );
    if ((existing.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      return fail("Employee not found.", 404);
    }
    const duplicate = await client.query(
      "SELECT employee_id FROM public.mt_employee WHERE employee_code = $1 AND employee_id <> $2 LIMIT 1",
      [parsed.employee.code, id],
    );
    if ((duplicate.rowCount ?? 0) > 0) {
      await client.query("ROLLBACK");
      return fail("Employee Code already exists.", 409);
    }
    const e = parsed.employee;
    const result = await client.query(
      "UPDATE public.mt_employee SET employee_code=$1, first_name=$2, middle_name=$3, last_name=$4, employee_name=$5, position=$6, contact_no=$7, email=$8, is_active=$9, updated_by=$10, updated_at=CURRENT_TIMESTAMP WHERE employee_id=$11 RETURNING employee_id, employee_code, first_name, middle_name, last_name, employee_name, position, contact_no, email, is_active",
      [
        e.code,
        e.firstName,
        e.middleName,
        e.lastName,
        e.name,
        e.position,
        e.contactNo,
        e.email,
        e.isActive,
        auth.user.userId,
        id,
      ],
    );
    await client.query("COMMIT");
    return Response.json({
      success: true,
      message: "Employee updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to update employee:", error);
    return fail(
      duplicateError(error)
        ? "Employee Code already exists."
        : "The employee could not be updated.",
      duplicateError(error) ? 409 : 500,
    );
  } finally {
    client.release();
  }
}
