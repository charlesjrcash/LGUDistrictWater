import { Pool } from "pg";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as {
  penaltyRatesPool?: Pool;
};

const pool =
  globalForDb.penaltyRatesPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.penaltyRatesPool = pool;
}

interface PenaltyRateInput {
  penaltyCode: string;
  penaltyName: string;
  penaltyType: string;
  rate: string;
  gracePeriodDays: string;
  maximumPenalty: string | null;
  effectiveDate: string;
  expirationDate: string | null;
  description: string | null;
  isActive: boolean;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(value: unknown) {
  const text = getString(value);
  return text || null;
}

function isDuplicatePenaltyCodeError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function isValidDecimal(value: string, scale: number, maximum: number) {
  const decimalPattern = new RegExp(`^\\d+(?:\\.\\d{1,${scale}})?$`);
  const numberValue = Number(value);

  return (
    decimalPattern.test(value) &&
    Number.isFinite(numberValue) &&
    numberValue >= 0 &&
    numberValue <= maximum
  );
}

function parsePenaltyRate(body: Record<string, unknown>) {
  const penaltyRate: PenaltyRateInput = {
    penaltyCode: getString(body.penalty_code).toUpperCase(),
    penaltyName: getString(body.penalty_name),
    penaltyType: getString(body.penalty_type).toUpperCase(),
    rate: getString(body.rate),
    gracePeriodDays: getString(body.grace_period_days),
    maximumPenalty: getOptionalString(body.maximum_penalty),
    effectiveDate: getString(body.effective_date),
    expirationDate: getOptionalString(body.expiration_date),
    description: getOptionalString(body.description),
    isActive: typeof body.is_active === "boolean" ? body.is_active : true,
  };

  if (
    !penaltyRate.penaltyCode ||
    !penaltyRate.penaltyName ||
    !penaltyRate.penaltyType ||
    !penaltyRate.rate ||
    !penaltyRate.gracePeriodDays ||
    !penaltyRate.effectiveDate
  ) {
    return {
      error: "Please complete all required fields.",
    };
  }

  if (
    penaltyRate.penaltyCode.length > 30 ||
    penaltyRate.penaltyName.length > 100 ||
    penaltyRate.penaltyType.length > 30
  ) {
    return {
      error: "One or more fields exceed the allowed length.",
    };
  }

  if (!isValidDecimal(penaltyRate.rate, 4, 999999.9999)) {
    return {
      error:
        "Rate must be a valid number from 0 to 999999.9999 with up to 4 decimal places.",
    };
  }

  if (
    !/^\d+$/.test(penaltyRate.gracePeriodDays) ||
    Number(penaltyRate.gracePeriodDays) > 2147483647
  ) {
    return {
      error:
        "Grace period days must be a whole number greater than or equal to zero.",
    };
  }

  if (
    penaltyRate.maximumPenalty &&
    !isValidDecimal(penaltyRate.maximumPenalty, 2, 999999999999.99)
  ) {
    return {
      error:
        "Maximum penalty must be a valid number from 0 to 999999999999.99 with up to 2 decimal places.",
    };
  }

  if (
    !isValidDate(penaltyRate.effectiveDate) ||
    (penaltyRate.expirationDate && !isValidDate(penaltyRate.expirationDate))
  ) {
    return {
      error: "Please enter valid effective and expiration dates.",
    };
  }

  if (
    penaltyRate.expirationDate &&
    penaltyRate.expirationDate < penaltyRate.effectiveDate
  ) {
    return {
      error: "Expiration date cannot be earlier than the effective date.",
    };
  }

  return { penaltyRate };
}

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        penalty_id,
        penalty_code,
        penalty_name,
        penalty_type,
        rate,
        grace_period_days,
        maximum_penalty,
        TO_CHAR(effective_date, 'YYYY-MM-DD') AS effective_date,
        TO_CHAR(expiration_date, 'YYYY-MM-DD') AS expiration_date,
        description,
        is_active
      FROM mt_penalty_rates
      ORDER BY penalty_type, penalty_code;
    `);

    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Failed to load penalty rates:", error);

    return Response.json(
      { success: false, message: "Unable to load penalty rates." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parsePenaltyRate(body);

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
        `SELECT penalty_id FROM mt_penalty_rates WHERE penalty_code = $1 LIMIT 1`,
        [parsed.penaltyRate.penaltyCode],
      );

      if ((duplicateResult.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            success: false,
            message: "That penalty code is already registered.",
          },
          { status: 409 },
        );
      }

      const result = await client.query(
        `
          INSERT INTO mt_penalty_rates (
            penalty_code, penalty_name, penalty_type, rate,
            grace_period_days, maximum_penalty, effective_date,
            expiration_date, description, is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING
            penalty_id, penalty_code, penalty_name, penalty_type, rate,
            grace_period_days, maximum_penalty,
            TO_CHAR(effective_date, 'YYYY-MM-DD') AS effective_date,
            TO_CHAR(expiration_date, 'YYYY-MM-DD') AS expiration_date,
            description, is_active
        `,
        [
          parsed.penaltyRate.penaltyCode,
          parsed.penaltyRate.penaltyName,
          parsed.penaltyRate.penaltyType,
          parsed.penaltyRate.rate,
          parsed.penaltyRate.gracePeriodDays,
          parsed.penaltyRate.maximumPenalty,
          parsed.penaltyRate.effectiveDate,
          parsed.penaltyRate.expirationDate,
          parsed.penaltyRate.description,
          parsed.penaltyRate.isActive,
        ],
      );

      await client.query("COMMIT");

      return Response.json(
        {
          success: true,
          message: "Penalty rate saved successfully.",
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
    console.error("Failed to save penalty rate:", error);

    if (isDuplicatePenaltyCodeError(error)) {
      return Response.json(
        {
          success: false,
          message: "That penalty code is already registered.",
        },
        { status: 409 },
      );
    }

    return Response.json(
      { success: false, message: "The penalty rate could not be saved." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const penaltyId = getString(body.penalty_id);
    const parsed = parsePenaltyRate(body);

    if (!/^\d+$/.test(penaltyId)) {
      return Response.json(
        { success: false, message: "Penalty rate ID is required." },
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
        `SELECT penalty_id FROM mt_penalty_rates WHERE penalty_id = $1 LIMIT 1`,
        [penaltyId],
      );

      if ((existingResult.rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");

        return Response.json(
          { success: false, message: "Penalty rate record was not found." },
          { status: 404 },
        );
      }

      const duplicateResult = await client.query(
        `
          SELECT penalty_id
          FROM mt_penalty_rates
          WHERE penalty_code = $1 AND penalty_id <> $2
          LIMIT 1
        `,
        [parsed.penaltyRate.penaltyCode, penaltyId],
      );

      if ((duplicateResult.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            success: false,
            message:
              "That penalty code is already registered to another penalty rate.",
          },
          { status: 409 },
        );
      }

      const result = await client.query(
        `
          UPDATE mt_penalty_rates
          SET
            penalty_code = $1,
            penalty_name = $2,
            penalty_type = $3,
            rate = $4,
            grace_period_days = $5,
            maximum_penalty = $6,
            effective_date = $7,
            expiration_date = $8,
            description = $9,
            is_active = $10,
            updated_at = CURRENT_TIMESTAMP
          WHERE penalty_id = $11
          RETURNING
            penalty_id, penalty_code, penalty_name, penalty_type, rate,
            grace_period_days, maximum_penalty,
            TO_CHAR(effective_date, 'YYYY-MM-DD') AS effective_date,
            TO_CHAR(expiration_date, 'YYYY-MM-DD') AS expiration_date,
            description, is_active
        `,
        [
          parsed.penaltyRate.penaltyCode,
          parsed.penaltyRate.penaltyName,
          parsed.penaltyRate.penaltyType,
          parsed.penaltyRate.rate,
          parsed.penaltyRate.gracePeriodDays,
          parsed.penaltyRate.maximumPenalty,
          parsed.penaltyRate.effectiveDate,
          parsed.penaltyRate.expirationDate,
          parsed.penaltyRate.description,
          parsed.penaltyRate.isActive,
          penaltyId,
        ],
      );

      await client.query("COMMIT");

      return Response.json({
        success: true,
        message: "Penalty rate updated successfully.",
        data: result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to update penalty rate:", error);

    if (isDuplicatePenaltyCodeError(error)) {
      return Response.json(
        {
          success: false,
          message:
            "That penalty code is already registered to another penalty rate.",
        },
        { status: 409 },
      );
    }

    return Response.json(
      { success: false, message: "The penalty rate could not be updated." },
      { status: 500 },
    );
  }
}
