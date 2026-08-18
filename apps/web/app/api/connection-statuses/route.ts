import { Pool } from "pg";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as { connectionStatusesPool?: Pool };
const pool = globalForDb.connectionStatusesPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.connectionStatusesPool = pool;
}

interface ConnectionStatusInput {
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parse(body: Record<string, unknown>) {
  const connectionStatus: ConnectionStatusInput = {
    code: text(body.status_code).toUpperCase(),
    name: text(body.status_name),
    description: text(body.description) || null,
    isActive: typeof body.is_active === "boolean" ? body.is_active : true,
  };
  return connectionStatus.code && connectionStatus.name
    ? { connectionStatus }
    : { error: "Please complete all required fields." };
}

function duplicateCodeError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error &&
    error.code === "23505";
}

function fail(message: string, status: number) {
  return Response.json({ success: false, message }, { status });
}

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT connection_status_id, status_code, status_name, description, is_active
      FROM mt_connection_status
      ORDER BY status_code;
    `);
    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Failed to load connection statuses:", error);
    return fail("Unable to load connection statuses.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = parse(await request.json());
    if ("error" in parsed) return fail(parsed.error, 400);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const duplicate = await client.query(
        `
          SELECT connection_status_id
          FROM mt_connection_status
          WHERE status_code = $1
          LIMIT 1
        `,
        [parsed.connectionStatus.code]
      );
      if ((duplicate.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");
        return fail("That connection status code is already registered.", 409);
      }
      const result = await client.query(
        `
          INSERT INTO mt_connection_status (
            status_code, status_name, description, is_active
          ) VALUES ($1, $2, $3, $4)
          RETURNING connection_status_id, status_code, status_name, description, is_active
        `,
        [
          parsed.connectionStatus.code,
          parsed.connectionStatus.name,
          parsed.connectionStatus.description,
          parsed.connectionStatus.isActive,
        ]
      );
      await client.query("COMMIT");
      return Response.json({
        success: true,
        message: "Connection status saved successfully.",
        data: result.rows[0],
      }, { status: 201 });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to save connection status:", error);
    return fail(duplicateCodeError(error)
      ? "That connection status code is already registered."
      : "The connection status could not be saved.", duplicateCodeError(error) ? 409 : 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const connectionStatusId = text(body.connection_status_id);
    const parsed = parse(body);
    if (!/^\d+$/.test(connectionStatusId)) return fail("Connection status ID is required.", 400);
    if ("error" in parsed) return fail(parsed.error, 400);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        `
          SELECT connection_status_id FROM mt_connection_status
          WHERE connection_status_id = $1 LIMIT 1
        `,
        [connectionStatusId]
      );
      if ((existing.rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");
        return fail("Connection status not found.", 404);
      }
      const duplicate = await client.query(
        `
          SELECT connection_status_id FROM mt_connection_status
          WHERE status_code = $1 AND connection_status_id <> $2
          LIMIT 1
        `,
        [parsed.connectionStatus.code, connectionStatusId]
      );
      if ((duplicate.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");
        return fail("That connection status code is already registered.", 409);
      }
      const result = await client.query(
        `
          UPDATE mt_connection_status SET
            status_code = $1,
            status_name = $2,
            description = $3,
            is_active = $4,
            updated_at = CURRENT_TIMESTAMP
          WHERE connection_status_id = $5
          RETURNING connection_status_id, status_code, status_name, description, is_active
        `,
        [
          parsed.connectionStatus.code,
          parsed.connectionStatus.name,
          parsed.connectionStatus.description,
          parsed.connectionStatus.isActive,
          connectionStatusId,
        ]
      );
      await client.query("COMMIT");
      return Response.json({ success: true, message: "Connection status updated successfully.", data: result.rows[0] });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to update connection status:", error);
    return fail(duplicateCodeError(error)
      ? "That connection status code is already registered."
      : "The connection status could not be updated.", duplicateCodeError(error) ? 409 : 500);
  }
}
