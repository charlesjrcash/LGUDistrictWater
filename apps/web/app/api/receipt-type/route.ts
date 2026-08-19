import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/server-session";
export const runtime = "nodejs";
type ReceiptTypeInput = {
  code: string;
  name: string;
  description: string | null;
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
function parseReceiptType(
  body: Record<string, unknown>,
): { receiptType: ReceiptTypeInput } | { error: string } {
  const code = text(body.receipt_type_code);
  const name = text(body.receipt_type_name);
  if (!code) return { error: "Receipt Type Code is required." };
  if (!name) return { error: "Receipt Type Name is required." };
  return {
    receiptType: {
      code: code.toUpperCase(),
      name,
      description: text(body.description) || null,
      isActive: typeof body.is_active === "boolean" ? body.is_active : true,
    },
  };
}
export async function GET() {
  const auth = await requireSessionUser();
  if (auth.response) return auth.response;
  try {
    const result = await db.query(
      "SELECT receipt_type_id, receipt_type_code, receipt_type_name, description, is_active FROM public.mt_receipt_type ORDER BY receipt_type_code ASC",
    );
    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Failed to load receipt types:", error);
    return fail("Unable to load receipt types.", 500);
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
  const parsed = parseReceiptType(body);
  if ("error" in parsed) return fail(parsed.error ?? "Invalid request.", 400);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const duplicate = await client.query(
      "SELECT receipt_type_id FROM public.mt_receipt_type WHERE receipt_type_code = $1 LIMIT 1",
      [parsed.receiptType.code],
    );
    if ((duplicate.rowCount ?? 0) > 0) {
      await client.query("ROLLBACK");
      return fail("Receipt Type Code already exists.", 409);
    }
    const result = await client.query(
      "INSERT INTO public.mt_receipt_type (receipt_type_code, receipt_type_name, description, is_active, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING receipt_type_id, receipt_type_code, receipt_type_name, description, is_active",
      [
        parsed.receiptType.code,
        parsed.receiptType.name,
        parsed.receiptType.description,
        parsed.receiptType.isActive,
        auth.user.userId,
      ],
    );
    await client.query("COMMIT");
    return Response.json(
      {
        success: true,
        message: "Receipt type saved successfully.",
        data: result.rows[0],
      },
      { status: 201 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to save receipt type:", error);
    return fail(
      duplicateError(error)
        ? "Receipt Type Code already exists."
        : "The receipt type could not be saved.",
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
  const id = text(body.receipt_type_id);
  const parsed = parseReceiptType(body);
  if (!/^\d+$/.test(id)) return fail("Receipt Type ID is required.", 400);
  if ("error" in parsed) return fail(parsed.error ?? "Invalid request.", 400);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT receipt_type_id FROM public.mt_receipt_type WHERE receipt_type_id = $1 LIMIT 1",
      [id],
    );
    if ((existing.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      return fail("Receipt type not found.", 404);
    }
    const duplicate = await client.query(
      "SELECT receipt_type_id FROM public.mt_receipt_type WHERE receipt_type_code = $1 AND receipt_type_id <> $2 LIMIT 1",
      [parsed.receiptType.code, id],
    );
    if ((duplicate.rowCount ?? 0) > 0) {
      await client.query("ROLLBACK");
      return fail("Receipt Type Code already exists.", 409);
    }
    const result = await client.query(
      "UPDATE public.mt_receipt_type SET receipt_type_code = $1, receipt_type_name = $2, description = $3, is_active = $4, updated_by = $5, updated_at = CURRENT_TIMESTAMP WHERE receipt_type_id = $6 RETURNING receipt_type_id, receipt_type_code, receipt_type_name, description, is_active",
      [
        parsed.receiptType.code,
        parsed.receiptType.name,
        parsed.receiptType.description,
        parsed.receiptType.isActive,
        auth.user.userId,
        id,
      ],
    );
    await client.query("COMMIT");
    return Response.json({
      success: true,
      message: "Receipt type updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to update receipt type:", error);
    return fail(
      duplicateError(error)
        ? "Receipt Type Code already exists."
        : "The receipt type could not be updated.",
      duplicateError(error) ? 409 : 500,
    );
  } finally {
    client.release();
  }
}
