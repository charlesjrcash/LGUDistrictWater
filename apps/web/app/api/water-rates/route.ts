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
};

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
    console.error(
      "Water rates fetch failed:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          "The water rates could not be loaded. Check the database connection and try again.",
      },
      { status: 500 }
    );
  }
}