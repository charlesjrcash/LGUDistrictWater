import { Pool } from "pg";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as {
  waterRatesUpdatePool?: Pool;
};

const pool =
  globalForDb.waterRatesUpdatePool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.waterRatesUpdatePool = pool;
}

/**
 * Handles:
 *
 * PUT /api/water-rates/[rate_id]
 *
 * Updates an existing water rate.
 */
export async function PUT(
  request: Request,
  context: {
    params: Promise<{
      rate_id: string;
    }>;
  },
) {
  try {
    const { rate_id } = await context.params;

    const rateId = Number(rate_id);

    if (!Number.isInteger(rateId) || rateId <= 0) {
      return Response.json(
        {
          success: false,
          message: "Invalid water rate ID.",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    const classificationId = Number(body.classification_id);

    const meterSizeId = Number(body.meter_size_id);

    const minimumCubicMeter = Number(body.minimum_cubic_meter);

    const maximumCubicMeter =
      body.maximum_cubic_meter === "" ||
      body.maximum_cubic_meter === null ||
      body.maximum_cubic_meter === undefined
        ? null
        : Number(body.maximum_cubic_meter);

    const rateType =
      typeof body.rate_type === "string" ? body.rate_type.trim() : "";

    const rateAmount = Number(body.rate_amount);

    const effectiveDate =
      typeof body.effective_date === "string" ? body.effective_date : "";

    const expirationDate =
      typeof body.expiration_date === "string" && body.expiration_date !== ""
        ? body.expiration_date
        : null;

    const description =
      typeof body.description === "string" ? body.description.trim() : null;

    const isActive = body.is_active === true;

    /*
     * BASIC VALIDATION
     */

    if (!Number.isInteger(classificationId) || classificationId <= 0) {
      return Response.json(
        {
          success: false,
          message: "Please select a classification.",
        },
        { status: 400 },
      );
    }

    if (!Number.isInteger(meterSizeId) || meterSizeId <= 0) {
      return Response.json(
        {
          success: false,
          message: "Please select a meter size.",
        },
        { status: 400 },
      );
    }

    if (!rateType) {
      return Response.json(
        {
          success: false,
          message: "Please select a rate type.",
        },
        { status: 400 },
      );
    }

    if (!Number.isFinite(minimumCubicMeter) || minimumCubicMeter < 0) {
      return Response.json(
        {
          success: false,
          message: "Minimum consumption must be 0 or greater.",
        },
        { status: 400 },
      );
    }

    if (
      maximumCubicMeter !== null &&
      (!Number.isFinite(maximumCubicMeter) ||
        maximumCubicMeter < minimumCubicMeter)
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Maximum consumption cannot be less than minimum consumption.",
        },
        { status: 400 },
      );
    }

    if (!Number.isFinite(rateAmount) || rateAmount <= 0) {
      return Response.json(
        {
          success: false,
          message: "Rate amount must be greater than zero.",
        },
        { status: 400 },
      );
    }

    if (!effectiveDate) {
      return Response.json(
        {
          success: false,
          message: "Effective date is required.",
        },
        { status: 400 },
      );
    }

    if (expirationDate !== null && expirationDate < effectiveDate) {
      return Response.json(
        {
          success: false,
          message: "Expiration date cannot be earlier than effective date.",
        },
        { status: 400 },
      );
    }

    /*
     * CHECK THAT THE RATE EXISTS
     */

    const existingRate = await pool.query(
      `
        SELECT
          rate_id
        FROM mt_water_rates
        WHERE rate_id = $1
        `,
      [rateId],
    );

    if (existingRate.rowCount === 0) {
      return Response.json(
        {
          success: false,
          message: "The selected water rate does not exist.",
        },
        { status: 404 },
      );
    }

    /*
     * CHECK CLASSIFICATION
     */

    const classificationResult = await pool.query(
      `
        SELECT
          classification_id
        FROM mt_customer_classification
        WHERE classification_id = $1
          AND is_active = true
        `,
      [classificationId],
    );

    if (classificationResult.rowCount === 0) {
      return Response.json(
        {
          success: false,
          message: "The selected classification is not active.",
        },
        { status: 400 },
      );
    }

    /*
     * CHECK METER SIZE
     */

    const meterSizeResult = await pool.query(
      `
        SELECT
          meter_size_id
        FROM mt_meter_size
        WHERE meter_size_id = $1
          AND is_active = true
        `,
      [meterSizeId],
    );

    if (meterSizeResult.rowCount === 0) {
      return Response.json(
        {
          success: false,
          message: "The selected meter size is not active.",
        },
        { status: 400 },
      );
    }

    /*
     * CHECK FOR OVERLAPPING RATE RANGES
     *
     * IMPORTANT:
     *
     * rate_id <> $1
     *
     * excludes the record currently being edited.
     */

    const overlapResult = await pool.query(
      `
        SELECT
          rate_id
        FROM mt_water_rates
        WHERE rate_id <> $1
          AND classification_id = $2
          AND meter_size_id = $3
          AND is_active = true

          AND effective_date <=
              COALESCE($5::date, '9999-12-31'::date)

          AND COALESCE(expiration_date,
              '9999-12-31'::date) >= $4::date

          AND minimum_cubic_meter <=
              COALESCE($7::numeric, 999999999)

          AND COALESCE(maximum_cubic_meter,
              999999999) >= $6::numeric
        LIMIT 1
        `,
      [
        rateId,
        classificationId,
        meterSizeId,
        effectiveDate,
        expirationDate,
        minimumCubicMeter,
        maximumCubicMeter,
      ],
    );

    if ((overlapResult.rowCount ?? 0) > 0) {
      return Response.json(
        {
          success: false,
          message:
            "Another active water rate already overlaps this consumption range and effective period.",
        },
        { status: 409 },
      );
    }

    /*
     * UPDATE THE RATE
     */

    const updateResult = await pool.query(
      `
        UPDATE mt_water_rates
        SET
          classification_id = $1,
          meter_size_id = $2,
          minimum_cubic_meter = $3,
          maximum_cubic_meter = $4,
          rate_type = $5,
          rate_amount = $6,
          effective_date = $7,
          expiration_date = $8,
          description = $9,
          is_active = $10,
          updated_at = CURRENT_TIMESTAMP
        WHERE rate_id = $11
        RETURNING
          rate_id
        `,
      [
        classificationId,
        meterSizeId,
        minimumCubicMeter,
        maximumCubicMeter,
        rateType,
        rateAmount,
        effectiveDate,
        expirationDate,
        description,
        isActive,
        rateId,
      ],
    );

    if (updateResult.rowCount === 0) {
      return Response.json(
        {
          success: false,
          message: "The water rate could not be updated.",
        },
        { status: 404 },
      );
    }

    return Response.json({
      success: true,
      message: "Water rate updated successfully.",
      data: {
        rate_id: updateResult.rows[0].rate_id,
      },
    });
  } catch (error) {
    console.error("Water rate update failed:", error);

    return Response.json(
      {
        success: false,
        message:
          "The water rate could not be updated. Check the database connection and try again.",
      },
      { status: 500 },
    );
  }
}
