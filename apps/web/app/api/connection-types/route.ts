import { Pool } from "pg";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as { connectionTypesPool?: Pool };
const pool = globalForDb.connectionTypesPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.connectionTypesPool = pool;
}

interface ConnectionTypeInput {
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parse(body: Record<string, unknown>) {
  const connectionType: ConnectionTypeInput = {
    code: text(body.connection_type_code).toUpperCase(),
    name: text(body.connection_type_name),
    description: text(body.description) || null,
    isActive: typeof body.is_active === "boolean" ? body.is_active : true,
  };

  return connectionType.code && connectionType.name
    ? { connectionType }
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
      SELECT
        connection_type_id,
        connection_type_code,
        connection_type_name,
        description,
        is_active
      FROM mt_connection_type
      ORDER BY connection_type_code;
    `);
    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Failed to load connection types:", error);
    return fail("Unable to load connection types.", 500);
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
          SELECT connection_type_id
          FROM mt_connection_type
          WHERE connection_type_code = $1
          LIMIT 1
        `,
        [parsed.connectionType.code]
      );

      if ((duplicate.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");
        return fail("That connection type code is already registered.", 409);
      }

      const result = await client.query(
        `
          INSERT INTO mt_connection_type (
            connection_type_code, connection_type_name, description, is_active
          )
          VALUES ($1, $2, $3, $4)
          RETURNING
            connection_type_id,
            connection_type_code,
            connection_type_name,
            description,
            is_active
        `,
        [
          parsed.connectionType.code,
          parsed.connectionType.name,
          parsed.connectionType.description,
          parsed.connectionType.isActive,
        ]
      );

      await client.query("COMMIT");
      return Response.json({
        success: true,
        message: "Connection type saved successfully.",
        data: result.rows[0],
      }, { status: 201 });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to save connection type:", error);
    return fail(
      duplicateCodeError(error)
        ? "That connection type code is already registered."
        : "The connection type could not be saved.",
      duplicateCodeError(error) ? 409 : 500
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const connectionTypeId = text(body.connection_type_id);
    const parsed = parse(body);

    if (!/^\d+$/.test(connectionTypeId)) {
      return fail("Connection type ID is required.", 400);
    }
    if ("error" in parsed) return fail(parsed.error, 400);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        `
          SELECT connection_type_id
          FROM mt_connection_type
          WHERE connection_type_id = $1
          LIMIT 1
        `,
        [connectionTypeId]
      );

      if ((existing.rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");
        return fail("Connection type not found.", 404);
      }

      const duplicate = await client.query(
        `
          SELECT connection_type_id
          FROM mt_connection_type
          WHERE connection_type_code = $1
            AND connection_type_id <> $2
          LIMIT 1
        `,
        [parsed.connectionType.code, connectionTypeId]
      );

      if ((duplicate.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");
        return fail("That connection type code is already registered.", 409);
      }

      const result = await client.query(
        `
          UPDATE mt_connection_type
          SET
            connection_type_code = $1,
            connection_type_name = $2,
            description = $3,
            is_active = $4,
            updated_at = CURRENT_TIMESTAMP
          WHERE connection_type_id = $5
          RETURNING
            connection_type_id,
            connection_type_code,
            connection_type_name,
            description,
            is_active
        `,
        [
          parsed.connectionType.code,
          parsed.connectionType.name,
          parsed.connectionType.description,
          parsed.connectionType.isActive,
          connectionTypeId,
        ]
      );

      await client.query("COMMIT");
      return Response.json({
        success: true,
        message: "Connection type updated successfully.",
        data: result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to update connection type:", error);
    return fail(
      duplicateCodeError(error)
        ? "That connection type code is already registered."
        : "The connection type could not be updated.",
      duplicateCodeError(error) ? 409 : 500
    );
  }
}
