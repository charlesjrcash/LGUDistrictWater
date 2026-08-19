import { Pool } from "pg";

export const runtime = "nodejs";
const globalForDb = globalThis as unknown as { puroksPool?: Pool };
const pool =
  globalForDb.puroksPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForDb.puroksPool = pool;

interface PurokInput {
  barangayId: string;
  purokCode: string | null;
  purokName: string;
  description: string | null;
  isActive: boolean;
}
function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function parse(body: Record<string, unknown>) {
  const purok: PurokInput = {
    barangayId: text(body.barangay_id),
    purokCode: text(body.purok_code) || null,
    purokName: text(body.purok_name),
    description: text(body.description) || null,
    isActive: typeof body.is_active === "boolean" ? body.is_active : true,
  };
  if (!/^\d+$/.test(purok.barangayId))
    return { error: "Please select a valid barangay." };
  if (!purok.purokName)
    return { error: "Please complete all required fields." };
  return { purok };
}
function fail(message: string, status: number) {
  return Response.json({ success: false, message }, { status });
}
function isCompositeDuplicate(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505" &&
    "constraint" in error &&
    error.constraint === "uq_purok_barangay_name"
  );
}
export async function GET() {
  try {
    const result = await pool.query(
      `SELECT p.purok_id, p.barangay_id, b.barangay_name, p.purok_code, p.purok_name, p.description, p.is_active FROM mt_purok p INNER JOIN mt_barangay b ON b.barangay_id = p.barangay_id ORDER BY b.barangay_name, p.purok_name`,
    );
    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Failed to load puroks:", error);
    return fail("Unable to load puroks.", 500);
  }
}
async function validate(
  client: Pick<Pool, "query">,
  purok: PurokInput,
  id?: string,
) {
  const barangay = await client.query(
    `SELECT barangay_id FROM mt_barangay WHERE barangay_id = $1 LIMIT 1`,
    [purok.barangayId],
  );
  if ((barangay.rowCount ?? 0) === 0)
    return { message: "The selected barangay was not found.", status: 400 };
  const values = id
    ? [purok.barangayId, purok.purokName, id]
    : [purok.barangayId, purok.purokName];
  const duplicate = await client.query(
    `SELECT purok_id FROM mt_purok WHERE barangay_id = $1 AND purok_name = $2${id ? " AND purok_id <> $3" : ""} LIMIT 1`,
    values,
  );
  return (duplicate.rowCount ?? 0) > 0
    ? {
        message:
          "This Purok is already registered under the selected barangay.",
        status: 409,
      }
    : null;
}
export async function POST(request: Request) {
  try {
    const parsed = parse(await request.json());
    if ("error" in parsed) return fail(parsed.error ?? "Invalid request.", 400);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const invalid = await validate(client, parsed.purok);
      if (invalid) {
        await client.query("ROLLBACK");
        return fail(invalid.message, invalid.status);
      }
      const result = await client.query(
        `WITH inserted AS (INSERT INTO mt_purok (barangay_id, purok_code, purok_name, description, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *) SELECT p.purok_id, p.barangay_id, b.barangay_name, p.purok_code, p.purok_name, p.description, p.is_active FROM inserted p INNER JOIN mt_barangay b ON b.barangay_id = p.barangay_id`,
        [
          parsed.purok.barangayId,
          parsed.purok.purokCode,
          parsed.purok.purokName,
          parsed.purok.description,
          parsed.purok.isActive,
        ],
      );
      await client.query("COMMIT");
      return Response.json(
        {
          success: true,
          message: "Purok saved successfully.",
          data: result.rows[0],
        },
        { status: 201 },
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to save purok:", error);
    return fail(
      isCompositeDuplicate(error)
        ? "This Purok is already registered under the selected barangay."
        : "The purok could not be saved.",
      isCompositeDuplicate(error) ? 409 : 500,
    );
  }
}
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = text(body.purok_id);
    const parsed = parse(body);
    if (!/^\d+$/.test(id)) return fail("Purok ID is required.", 400);
    if ("error" in parsed) return fail(parsed.error ?? "Invalid request.", 400);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        `SELECT purok_id FROM mt_purok WHERE purok_id = $1 LIMIT 1`,
        [id],
      );
      if ((existing.rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");
        return fail("Purok record was not found.", 404);
      }
      const invalid = await validate(client, parsed.purok, id);
      if (invalid) {
        await client.query("ROLLBACK");
        return fail(invalid.message, invalid.status);
      }
      const result = await client.query(
        `WITH updated AS (UPDATE mt_purok SET barangay_id = $1, purok_code = $2, purok_name = $3, description = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP WHERE purok_id = $6 RETURNING *) SELECT p.purok_id, p.barangay_id, b.barangay_name, p.purok_code, p.purok_name, p.description, p.is_active FROM updated p INNER JOIN mt_barangay b ON b.barangay_id = p.barangay_id`,
        [
          parsed.purok.barangayId,
          parsed.purok.purokCode,
          parsed.purok.purokName,
          parsed.purok.description,
          parsed.purok.isActive,
          id,
        ],
      );
      await client.query("COMMIT");
      return Response.json({
        success: true,
        message: "Purok updated successfully.",
        data: result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to update purok:", error);
    return fail(
      isCompositeDuplicate(error)
        ? "This Purok is already registered under the selected barangay."
        : "The purok could not be updated.",
      isCompositeDuplicate(error) ? 409 : 500,
    );
  }
}
