import { Pool } from "pg";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as {
  applicationTypesPool?: Pool;
};

const pool =
  globalForDb.applicationTypesPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.applicationTypesPool = pool;
}

interface ApplicationTypeInput {
  applicationTypeCode: string;
  applicationTypeName: string;
  description: string | null;
  isActive: boolean;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(value: unknown) {
  return getString(value) || null;
}

function parseApplicationType(body: Record<string, unknown>) {
  const applicationType: ApplicationTypeInput = {
    applicationTypeCode: getString(body.application_type_code).toUpperCase(),
    applicationTypeName: getString(body.application_type_name),
    description: getOptionalString(body.description),
    isActive: typeof body.is_active === "boolean" ? body.is_active : true,
  };

  if (!applicationType.applicationTypeCode || !applicationType.applicationTypeName) {
    return { error: "Please complete all required fields." };
  }

  return { applicationType };
}

function isDuplicateApplicationTypeCodeError(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505";
}

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        application_type_id,
        application_type_code,
        application_type_name,
        description,
        is_active
      FROM mt_application_type
      ORDER BY application_type_code;
    `);

    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Failed to load application types:", error);

    return Response.json(
      { success: false, message: "Unable to load application types." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseApplicationType(body);

    if ("error" in parsed) {
      return Response.json(
        { success: false, message: parsed.error },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const duplicateResult = await client.query(
        `
          SELECT application_type_id
          FROM mt_application_type
          WHERE application_type_code = $1
          LIMIT 1
        `,
        [parsed.applicationType.applicationTypeCode]
      );

      if ((duplicateResult.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            success: false,
            message: "That application type code is already registered.",
          },
          { status: 409 }
        );
      }

      const result = await client.query(
        `
          INSERT INTO mt_application_type (
            application_type_code,
            application_type_name,
            description,
            is_active
          )
          VALUES ($1, $2, $3, $4)
          RETURNING
            application_type_id,
            application_type_code,
            application_type_name,
            description,
            is_active
        `,
        [
          parsed.applicationType.applicationTypeCode,
          parsed.applicationType.applicationTypeName,
          parsed.applicationType.description,
          parsed.applicationType.isActive,
        ]
      );

      await client.query("COMMIT");

      return Response.json(
        {
          success: true,
          message: "Application type saved successfully.",
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
    console.error("Failed to save application type:", error);

    if (isDuplicateApplicationTypeCodeError(error)) {
      return Response.json(
        {
          success: false,
          message: "That application type code is already registered.",
        },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, message: "The application type could not be saved." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const applicationTypeId = getString(body.application_type_id);
    const parsed = parseApplicationType(body);

    if (!/^\d+$/.test(applicationTypeId)) {
      return Response.json(
        { success: false, message: "Application type ID is required." },
        { status: 400 }
      );
    }

    if ("error" in parsed) {
      return Response.json(
        { success: false, message: parsed.error },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existingResult = await client.query(
        `
          SELECT application_type_id
          FROM mt_application_type
          WHERE application_type_id = $1
          LIMIT 1
        `,
        [applicationTypeId]
      );

      if ((existingResult.rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");

        return Response.json(
          { success: false, message: "Application type not found." },
          { status: 404 }
        );
      }

      const duplicateResult = await client.query(
        `
          SELECT application_type_id
          FROM mt_application_type
          WHERE application_type_code = $1
            AND application_type_id <> $2
          LIMIT 1
        `,
        [parsed.applicationType.applicationTypeCode, applicationTypeId]
      );

      if ((duplicateResult.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            success: false,
            message: "That application type code is already registered.",
          },
          { status: 409 }
        );
      }

      const result = await client.query(
        `
          UPDATE mt_application_type
          SET
            application_type_code = $1,
            application_type_name = $2,
            description = $3,
            is_active = $4,
            updated_at = CURRENT_TIMESTAMP
          WHERE application_type_id = $5
          RETURNING
            application_type_id,
            application_type_code,
            application_type_name,
            description,
            is_active
        `,
        [
          parsed.applicationType.applicationTypeCode,
          parsed.applicationType.applicationTypeName,
          parsed.applicationType.description,
          parsed.applicationType.isActive,
          applicationTypeId,
        ]
      );

      await client.query("COMMIT");

      return Response.json({
        success: true,
        message: "Application type updated successfully.",
        data: result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to update application type:", error);

    if (isDuplicateApplicationTypeCodeError(error)) {
      return Response.json(
        {
          success: false,
          message: "That application type code is already registered.",
        },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, message: "The application type could not be updated." },
      { status: 500 }
    );
  }
}
