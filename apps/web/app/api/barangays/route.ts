import { Pool } from "pg";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as { barangaysPool?: Pool };
const pool =
  globalForDb.barangaysPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForDb.barangaysPool = pool;

interface BarangayInput {
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}
function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function parse(body: Record<string, unknown>) {
  const barangay: BarangayInput = {
    code: text(body.barangay_code).toUpperCase(),
    name: text(body.barangay_name),
    description: text(body.description) || null,
    isActive: typeof body.is_active === "boolean" ? body.is_active : true,
  };
  return barangay.code && barangay.name
    ? { barangay }
    : { error: "Please complete all required fields." };
}
function duplicateMessage(error: unknown) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    error.code !== "23505"
  )
    return null;
  return "constraint" in error &&
    error.constraint === "mt_barangay_barangay_name_key"
    ? "That barangay name is already registered."
    : "That barangay code is already registered.";
}
function response(message: string, status: number) {
  return Response.json({ success: false, message }, { status });
}

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT barangay_id, barangay_code, barangay_name, description, is_active FROM mt_barangay ORDER BY barangay_name ASC`,
    );
    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Failed to load barangays:", error);
    return response("Unable to load barangays.", 500);
  }
}

async function hasDuplicate(
  client: Pick<Pool, "query">,
  barangay: BarangayInput,
  id?: string,
) {
  const suffix = id ? " AND barangay_id <> $2" : "";
  const values = id ? [barangay.code, id] : [barangay.code];
  const code = await client.query(
    `SELECT barangay_id FROM mt_barangay WHERE barangay_code = $1${suffix} LIMIT 1`,
    values,
  );
  if ((code.rowCount ?? 0) > 0)
    return "That barangay code is already registered.";
  const nameValues = id ? [barangay.name, id] : [barangay.name];
  const name = await client.query(
    `SELECT barangay_id FROM mt_barangay WHERE barangay_name = $1${suffix} LIMIT 1`,
    nameValues,
  );
  return (name.rowCount ?? 0) > 0
    ? "That barangay name is already registered."
    : null;
}

export async function POST(request: Request) {
  try {
    const parsed = parse(await request.json());
    if ("error" in parsed)
      return response(parsed.error ?? "Invalid request.", 400);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const duplicate = await hasDuplicate(client, parsed.barangay);
      if (duplicate) {
        await client.query("ROLLBACK");
        return response(duplicate, 409);
      }
      const result = await client.query(
        `INSERT INTO mt_barangay (barangay_code, barangay_name, description, is_active) VALUES ($1, $2, $3, $4) RETURNING barangay_id, barangay_code, barangay_name, description, is_active`,
        [
          parsed.barangay.code,
          parsed.barangay.name,
          parsed.barangay.description,
          parsed.barangay.isActive,
        ],
      );
      await client.query("COMMIT");
      return Response.json(
        {
          success: true,
          message: "Barangay saved successfully.",
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
    console.error("Failed to save barangay:", error);
    return response(
      duplicateMessage(error) ?? "The barangay could not be saved.",
      duplicateMessage(error) ? 409 : 500,
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = text(body.barangay_id);
    const parsed = parse(body);
    if (!/^\d+$/.test(id)) return response("Barangay ID is required.", 400);
    if ("error" in parsed)
      return response(parsed.error ?? "Invalid request.", 400);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        `SELECT barangay_id FROM mt_barangay WHERE barangay_id = $1 LIMIT 1`,
        [id],
      );
      if ((existing.rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");
        return response("Barangay record was not found.", 404);
      }
      const duplicate = await hasDuplicate(client, parsed.barangay, id);
      if (duplicate) {
        await client.query("ROLLBACK");
        return response(duplicate, 409);
      }
      const result = await client.query(
        `UPDATE mt_barangay SET barangay_code = $1, barangay_name = $2, description = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP WHERE barangay_id = $5 RETURNING barangay_id, barangay_code, barangay_name, description, is_active`,
        [
          parsed.barangay.code,
          parsed.barangay.name,
          parsed.barangay.description,
          parsed.barangay.isActive,
          id,
        ],
      );
      await client.query("COMMIT");
      return Response.json({
        success: true,
        message: "Barangay updated successfully.",
        data: result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to update barangay:", error);
    return response(
      duplicateMessage(error) ?? "The barangay could not be updated.",
      duplicateMessage(error) ? 409 : 500,
    );
  }
}
