import { Pool } from "pg";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as {
  billingPeriodsPool?: Pool;
};

const pool =
  globalForDb.billingPeriodsPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.billingPeriodsPool = pool;
}

const supportedStatuses = ["OPEN", "CLOSED"];

interface BillingPeriodInput {
  periodCode: string;
  periodName: string | null;
  startDate: string;
  endDate: string;
  dueDate: string | null;
  disconnectionDate: string | null;
  status: string;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(value: unknown) {
  return getString(value) || null;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function isDuplicatePeriodCodeError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function parseBillingPeriod(body: Record<string, unknown>) {
  const billingPeriod: BillingPeriodInput = {
    periodCode: getString(body.period_code).toUpperCase(),
    periodName: getOptionalString(body.period_name),
    startDate: getString(body.start_date),
    endDate: getString(body.end_date),
    dueDate: getOptionalString(body.due_date),
    disconnectionDate: getOptionalString(body.disconnection_date),
    status: getString(body.status).toUpperCase(),
  };

  if (
    !billingPeriod.periodCode ||
    !billingPeriod.startDate ||
    !billingPeriod.endDate ||
    !billingPeriod.status
  ) {
    return { error: "Please complete all required fields." };
  }

  if (
    !isValidDate(billingPeriod.startDate) ||
    !isValidDate(billingPeriod.endDate) ||
    (billingPeriod.dueDate && !isValidDate(billingPeriod.dueDate)) ||
    (billingPeriod.disconnectionDate &&
      !isValidDate(billingPeriod.disconnectionDate))
  ) {
    return { error: "Please enter valid dates." };
  }

  if (billingPeriod.endDate < billingPeriod.startDate) {
    return { error: "End date cannot be earlier than start date." };
  }

  if (!supportedStatuses.includes(billingPeriod.status)) {
    return { error: "Please select a valid billing period status." };
  }

  return { billingPeriod };
}

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        billing_period_id,
        period_code,
        period_name,
        TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date,
        TO_CHAR(due_date, 'YYYY-MM-DD') AS due_date,
        TO_CHAR(disconnection_date, 'YYYY-MM-DD') AS disconnection_date,
        status
      FROM mt_billing_period
      ORDER BY start_date ASC;
    `);

    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Failed to load billing periods:", error);

    return Response.json(
      { success: false, message: "Unable to load billing periods." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseBillingPeriod(body);

    if ("error" in parsed) {
      return Response.json(
        { success: false, message: parsed.error },
        { status: 400 },
      );
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const duplicateResult = await client.query(
        `SELECT billing_period_id FROM mt_billing_period WHERE period_code = $1 LIMIT 1`,
        [parsed.billingPeriod.periodCode],
      );

      if ((duplicateResult.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            success: false,
            message: "That period code is already registered.",
          },
          { status: 409 },
        );
      }

      const result = await client.query(
        `
          INSERT INTO mt_billing_period (
            period_code, period_name, start_date, end_date,
            due_date, disconnection_date, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING
            billing_period_id, period_code, period_name,
            TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
            TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date,
            TO_CHAR(due_date, 'YYYY-MM-DD') AS due_date,
            TO_CHAR(disconnection_date, 'YYYY-MM-DD') AS disconnection_date,
            status
        `,
        [
          parsed.billingPeriod.periodCode,
          parsed.billingPeriod.periodName,
          parsed.billingPeriod.startDate,
          parsed.billingPeriod.endDate,
          parsed.billingPeriod.dueDate,
          parsed.billingPeriod.disconnectionDate,
          parsed.billingPeriod.status,
        ],
      );

      await client.query("COMMIT");

      return Response.json(
        {
          success: true,
          message: "Billing period created successfully.",
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
    console.error("Failed to save billing period:", error);

    if (isDuplicatePeriodCodeError(error)) {
      return Response.json(
        { success: false, message: "That period code is already registered." },
        { status: 409 },
      );
    }

    return Response.json(
      { success: false, message: "The billing period could not be saved." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const billingPeriodId = getString(body.billing_period_id);
    const parsed = parseBillingPeriod(body);

    if (!/^\d+$/.test(billingPeriodId)) {
      return Response.json(
        { success: false, message: "Billing period ID is required." },
        { status: 400 },
      );
    }

    if ("error" in parsed) {
      return Response.json(
        { success: false, message: parsed.error },
        { status: 400 },
      );
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existingResult = await client.query(
        `SELECT billing_period_id FROM mt_billing_period WHERE billing_period_id = $1 LIMIT 1`,
        [billingPeriodId],
      );

      if ((existingResult.rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");

        return Response.json(
          { success: false, message: "Billing period record was not found." },
          { status: 404 },
        );
      }

      const duplicateResult = await client.query(
        `
          SELECT billing_period_id
          FROM mt_billing_period
          WHERE period_code = $1
            AND billing_period_id <> $2
          LIMIT 1
        `,
        [parsed.billingPeriod.periodCode, billingPeriodId],
      );

      if ((duplicateResult.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            success: false,
            message:
              "That period code is already registered to another billing period.",
          },
          { status: 409 },
        );
      }

      const result = await client.query(
        `
          UPDATE mt_billing_period
          SET
            period_code = $1,
            period_name = $2,
            start_date = $3,
            end_date = $4,
            due_date = $5,
            disconnection_date = $6,
            status = $7,
            updated_at = CURRENT_TIMESTAMP
          WHERE billing_period_id = $8
          RETURNING
            billing_period_id, period_code, period_name,
            TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
            TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date,
            TO_CHAR(due_date, 'YYYY-MM-DD') AS due_date,
            TO_CHAR(disconnection_date, 'YYYY-MM-DD') AS disconnection_date,
            status
        `,
        [
          parsed.billingPeriod.periodCode,
          parsed.billingPeriod.periodName,
          parsed.billingPeriod.startDate,
          parsed.billingPeriod.endDate,
          parsed.billingPeriod.dueDate,
          parsed.billingPeriod.disconnectionDate,
          parsed.billingPeriod.status,
          billingPeriodId,
        ],
      );

      await client.query("COMMIT");

      return Response.json({
        success: true,
        message: "Billing period updated successfully.",
        data: result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to update billing period:", error);

    if (isDuplicatePeriodCodeError(error)) {
      return Response.json(
        {
          success: false,
          message:
            "That period code is already registered to another billing period.",
        },
        { status: 409 },
      );
    }

    return Response.json(
      { success: false, message: "The billing period could not be updated." },
      { status: 500 },
    );
  }
}
