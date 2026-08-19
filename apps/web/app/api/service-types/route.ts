import { Pool } from "pg";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as { serviceTypesPool?: Pool };
const pool =
  globalForDb.serviceTypesPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") globalForDb.serviceTypesPool = pool;

interface ServiceTypeInput {
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function fail(message: string, status: number) {
  return Response.json({ success: false, message }, { status });
}
function duplicateCodeError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function parse(body: Record<string, unknown>) {
  const serviceType: ServiceTypeInput = {
    code: text(body.service_type_code).toUpperCase(),
    name: text(body.service_type_name),
    description: text(body.description) || null,
    isActive: typeof body.is_active === "boolean" ? body.is_active : true,
  };
  return serviceType.code && serviceType.name
    ? { serviceType }
    : { error: "Please complete all required fields." };
}

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT service_type_id, service_type_code, service_type_name, description, is_active FROM mt_service_type ORDER BY service_type_code;`,
    );
    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Failed to load service types:", error);
    return fail("Unable to load service types.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = parse(await request.json());
    if ("error" in parsed) return fail(parsed.error ?? "Invalid request.", 400);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const duplicate = await client.query(
        `SELECT service_type_id FROM mt_service_type WHERE service_type_code = $1 LIMIT 1`,
        [parsed.serviceType.code],
      );
      if ((duplicate.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");
        return fail("That service type code is already registered.", 409);
      }
      const result = await client.query(
        `INSERT INTO mt_service_type (service_type_code, service_type_name, description, is_active) VALUES ($1, $2, $3, $4) RETURNING service_type_id, service_type_code, service_type_name, description, is_active`,
        [
          parsed.serviceType.code,
          parsed.serviceType.name,
          parsed.serviceType.description,
          parsed.serviceType.isActive,
        ],
      );
      await client.query("COMMIT");
      return Response.json(
        {
          success: true,
          message: "Service type saved successfully.",
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
    console.error("Failed to save service type:", error);
    return fail(
      duplicateCodeError(error)
        ? "That service type code is already registered."
        : "The service type could not be saved.",
      duplicateCodeError(error) ? 409 : 500,
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const serviceTypeId = text(body.service_type_id);
    const parsed = parse(body);
    if (!/^\d+$/.test(serviceTypeId))
      return fail("Service type ID is required.", 400);
    if ("error" in parsed) return fail(parsed.error ?? "Invalid request.", 400);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        `SELECT service_type_id FROM mt_service_type WHERE service_type_id = $1 LIMIT 1`,
        [serviceTypeId],
      );
      if ((existing.rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");
        return fail("Service type not found.", 404);
      }
      const duplicate = await client.query(
        `SELECT service_type_id FROM mt_service_type WHERE service_type_code = $1 AND service_type_id <> $2 LIMIT 1`,
        [parsed.serviceType.code, serviceTypeId],
      );
      if ((duplicate.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");
        return fail("That service type code is already registered.", 409);
      }
      const result = await client.query(
        `UPDATE mt_service_type SET service_type_code = $1, service_type_name = $2, description = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP WHERE service_type_id = $5 RETURNING service_type_id, service_type_code, service_type_name, description, is_active`,
        [
          parsed.serviceType.code,
          parsed.serviceType.name,
          parsed.serviceType.description,
          parsed.serviceType.isActive,
          serviceTypeId,
        ],
      );
      await client.query("COMMIT");
      return Response.json({
        success: true,
        message: "Service type updated successfully.",
        data: result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to update service type:", error);
    return fail(
      duplicateCodeError(error)
        ? "That service type code is already registered."
        : "The service type could not be updated.",
      duplicateCodeError(error) ? 409 : 500,
    );
  }
}
