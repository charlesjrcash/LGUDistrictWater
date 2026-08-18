import { Pool } from "pg";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as {
  applicationStatusesPool?: Pool;
};

const pool =
  globalForDb.applicationStatusesPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalForDb.applicationStatusesPool = pool;
}

interface ApplicationStatusInput {
  statusCode: string;
  statusName: string;
  description: string | null;
  isActive: boolean;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseApplicationStatus(body: Record<string, unknown>) {
  const applicationStatus: ApplicationStatusInput = {
    statusCode: getString(body.status_code).toUpperCase(),
    statusName: getString(body.status_name),
    description: getString(body.description) || null,
    isActive: typeof body.is_active === "boolean" ? body.is_active : true,
  };

  if (!applicationStatus.statusCode || !applicationStatus.statusName) {
    return { error: "Please complete all required fields." };
  }

  return { applicationStatus };
}

function isDuplicateStatusCodeError(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505";
}

function fail(message: string, status: number) {
  return Response.json({ success: false, message }, { status });
}

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        application_status_id,
        status_code,
        status_name,
        description,
        is_active
      FROM mt_application_status
      ORDER BY status_code;
    `);

    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Failed to load application statuses:", error);
    return fail("Unable to load application statuses.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = parseApplicationStatus(await request.json());

    if ("error" in parsed) return fail(parsed.error, 400);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const duplicate = await client.query(
        `
          SELECT application_status_id
          FROM mt_application_status
          WHERE status_code = $1
          LIMIT 1
        `,
        [parsed.applicationStatus.statusCode]
      );

      if ((duplicate.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");
        return fail("That application status code is already registered.", 409);
      }

      const result = await client.query(
        `
          INSERT INTO mt_application_status (
            status_code, status_name, description, is_active
          )
          VALUES ($1, $2, $3, $4)
          RETURNING
            application_status_id,
            status_code,
            status_name,
            description,
            is_active
        `,
        [
          parsed.applicationStatus.statusCode,
          parsed.applicationStatus.statusName,
          parsed.applicationStatus.description,
          parsed.applicationStatus.isActive,
        ]
      );

      await client.query("COMMIT");
      return Response.json(
        {
          success: true,
          message: "Application status saved successfully.",
          data: result.rows[0],
        },
        { status: 201 }
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to save application status:", error);
    return fail(
      isDuplicateStatusCodeError(error)
        ? "That application status code is already registered."
        : "The application status could not be saved.",
      isDuplicateStatusCodeError(error) ? 409 : 500
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const applicationStatusId = getString(body.application_status_id);
    const parsed = parseApplicationStatus(body);

    if (!/^\d+$/.test(applicationStatusId)) {
      return fail("Application status ID is required.", 400);
    }

    if ("error" in parsed) return fail(parsed.error, 400);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existing = await client.query(
        `
          SELECT application_status_id
          FROM mt_application_status
          WHERE application_status_id = $1
          LIMIT 1
        `,
        [applicationStatusId]
      );

      if ((existing.rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");
        return fail("Application status not found.", 404);
      }

      const duplicate = await client.query(
        `
          SELECT application_status_id
          FROM mt_application_status
          WHERE status_code = $1
            AND application_status_id <> $2
          LIMIT 1
        `,
        [parsed.applicationStatus.statusCode, applicationStatusId]
      );

      if ((duplicate.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");
        return fail("That application status code is already registered.", 409);
      }

      const result = await client.query(
        `
          UPDATE mt_application_status
          SET
            status_code = $1,
            status_name = $2,
            description = $3,
            is_active = $4,
            updated_at = CURRENT_TIMESTAMP
          WHERE application_status_id = $5
          RETURNING
            application_status_id,
            status_code,
            status_name,
            description,
            is_active
        `,
        [
          parsed.applicationStatus.statusCode,
          parsed.applicationStatus.statusName,
          parsed.applicationStatus.description,
          parsed.applicationStatus.isActive,
          applicationStatusId,
        ]
      );

      await client.query("COMMIT");
      return Response.json({
        success: true,
        message: "Application status updated successfully.",
        data: result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to update application status:", error);
    return fail(
      isDuplicateStatusCodeError(error)
        ? "That application status code is already registered."
        : "The application status could not be updated.",
      isDuplicateStatusCodeError(error) ? 409 : 500
    );
  }
}
