import { Pool } from "pg";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as {
  waterRateOptionsPool?: Pool;
};

const pool =
  globalForDb.waterRateOptionsPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.waterRateOptionsPool = pool;
}

export async function GET() {
  try {
    /*
     * GET ACTIVE CUSTOMER CLASSIFICATIONS
     */
    const classificationResult = await pool.query(`
      SELECT
        classification_id,
        classification_name
      FROM mt_customer_classification
      WHERE is_active = true
      ORDER BY classification_name;
    `);

    /*
     * GET ACTIVE METER SIZES
     */
    const meterSizeResult = await pool.query(`
      SELECT
        meter_size_id,
        meter_size
      FROM mt_meter_size
      WHERE is_active = true
      ORDER BY meter_size;
    `);

    return Response.json({
      success: true,
      classifications: classificationResult.rows,
      meterSizes: meterSizeResult.rows,
    });
  } catch (error) {
    console.error("Water rate options fetch failed:", error);

    return Response.json(
      {
        success: false,
        message: "Unable to load classifications and meter sizes.",
      },
      { status: 500 },
    );
  }
}
