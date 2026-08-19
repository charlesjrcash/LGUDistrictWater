import { Pool } from "pg";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as {
  waterRatesPool?: Pool;
};

// Reuse one PostgreSQL connection pool during local hot reloads.
const pool =
  globalForDb.waterRatesPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.waterRatesPool = pool;
}

/**
 * Handles GET /api/water-rates
 *
 * Returns the water rates together with:
 * - Customer Classification
 * - Meter Size
 */
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        wr.rate_id,
        wr.classification_id,
        cc.classification_name,
        wr.meter_size_id,
        ms.meter_size,
        wr.minimum_cubic_meter,
        wr.maximum_cubic_meter,
        wr.rate_type,
        wr.rate_amount,
       TO_CHAR(wr.effective_date, 'YYYY-MM-DD') AS effective_date,
        TO_CHAR(wr.expiration_date, 'YYYY-MM-DD') AS expiration_date,
        wr.description,
        wr.is_active
      FROM mt_water_rates wr
      INNER JOIN mt_customer_classification cc
        ON cc.classification_id = wr.classification_id
      INNER JOIN mt_meter_size ms
        ON ms.meter_size_id = wr.meter_size_id
      ORDER BY
        cc.classification_name,
        ms.meter_size,
        wr.minimum_cubic_meter;
    `);

    return Response.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Water rates fetch failed:", error);

    return Response.json(
      {
        success: false,
        message:
          "The water rates could not be loaded. Check the database connection and try again.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
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

    const rateAmount = Number(body.rate_amount);

    const rateType =
      typeof body.rate_type === "string" ? body.rate_type.trim() : "";

    const effectiveDate =
      typeof body.effective_date === "string" ? body.effective_date : "";

    const expirationDate =
      typeof body.expiration_date === "string" && body.expiration_date !== ""
        ? body.expiration_date
        : null;

    const description =
      typeof body.description === "string" ? body.description.trim() : null;

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

    /*
     * DATE VALIDATION
     */

    if (expirationDate && expirationDate < effectiveDate) {
      return Response.json(
        {
          success: false,
          message: "Expiration date cannot be earlier than the effective date.",
        },
        { status: 400 },
      );
    }

    /*
     * GET DATABASE CLIENT
     *
     * Use the same pool that your existing
     * GET method is already using.
     */

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      /*
       * Make sure the classification exists.
       */
      const classificationResult = await client.query(
        `
          SELECT classification_id
          FROM mt_customer_classification
          WHERE classification_id = $1
            AND is_active = true
          `,
        [classificationId],
      );

      if (classificationResult.rowCount === 0) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            success: false,
            message: "The selected classification is not active.",
          },
          { status: 400 },
        );
      }

      /*
       * Make sure the meter size exists.
       */
      const meterSizeResult = await client.query(
        `
          SELECT meter_size_id
          FROM mt_meter_size
          WHERE meter_size_id = $1
            AND is_active = true
          `,
        [meterSizeId],
      );

      if (meterSizeResult.rowCount === 0) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            success: false,
            message: "The selected meter size is not active.",
          },
          { status: 400 },
        );
      }

      /*
       * IMPORTANT BILLING VALIDATION
       *
       * Prevent overlapping consumption ranges
       * for the same classification and meter size.
       *
       * Example:
       *
       * Existing:
       * 0 - 10
       *
       * New:
       * 10 - 15
       *
       * This would overlap and therefore be rejected.
       */

      const overlapResult = await client.query(
        `
          SELECT rate_id
          FROM mt_water_rates
          WHERE classification_id = $1
            AND meter_size_id = $2
            AND is_active = true

            AND effective_date <= COALESCE(
              $4::date,
              '9999-12-31'::date
            )

            AND COALESCE(
              expiration_date,
              '9999-12-31'::date
            ) >= $3::date

            AND minimum_cubic_meter <= COALESCE(
              $6::numeric,
              999999999
            )

            AND COALESCE(
              maximum_cubic_meter,
              999999999
            ) >= $5::numeric

          LIMIT 1
          `,
        [
          classificationId,
          meterSizeId,
          effectiveDate,
          expirationDate,
          minimumCubicMeter,
          maximumCubicMeter,
        ],
      );

      if ((overlapResult.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            success: false,
            message:
              "This consumption range overlaps an existing active water rate for the selected classification and meter size.",
          },
          { status: 409 },
        );
      }

      /*
       * INSERT WATER RATE
       */

      const insertResult = await client.query(
        `
          INSERT INTO mt_water_rates (
            classification_id,
            meter_size_id,
            minimum_cubic_meter,
            maximum_cubic_meter,
            rate_type,
            rate_amount,
            effective_date,
            expiration_date,
            description,
            is_active
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            true
          )
          RETURNING rate_id
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
        ],
      );

      await client.query("COMMIT");

      return Response.json(
        {
          success: true,
          message: "Water rate created successfully.",
          rate_id: insertResult.rows[0].rate_id,
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
    console.error("Create water rate failed:", error);

    return Response.json(
      {
        success: false,
        message: "The water rate could not be saved.",
      },
      { status: 500 },
    );
  }
}
