import { Pool } from "pg";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as {
  feesPool?: Pool;
};

const pool =
  globalForDb.feesPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.feesPool = pool;
}

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        f.fee_id,
        f.fee_code,
        f.fee_name,
        f.fee_type,
        f.amount,
        f.effective_date,
        f.expiration_date,
        f.description,
        f.is_active
      FROM mt_fees f
      ORDER BY
        f.fee_type,
        f.fee_code;
    `);

    return Response.json({
      success: true,
      data: result.rows,
    });

  } catch (error) {

    console.error(
      "Failed to load fees:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          "Unable to load fees.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const feeCode =
      typeof body.fee_code === "string"
        ? body.fee_code.trim().toUpperCase()
        : "";

    const feeName =
      typeof body.fee_name === "string"
        ? body.fee_name.trim()
        : "";

    const feeType =
      typeof body.fee_type === "string"
        ? body.fee_type.trim().toUpperCase()
        : "";

    const amount = body.amount;

    const effectiveDate =
      typeof body.effective_date === "string"
        ? body.effective_date
        : "";

    const expirationDate =
      typeof body.expiration_date === "string" &&
      body.expiration_date.trim() !== ""
        ? body.expiration_date
        : null;

    const description =
      typeof body.description === "string"
        ? body.description.trim() || null
        : null;

    const isActive =
      typeof body.is_active === "boolean"
        ? body.is_active
        : true;

    // Required fields
    if (
      !feeCode ||
      !feeName ||
      !feeType ||
      amount === undefined ||
      amount === null ||
      !effectiveDate
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Please complete all required fields.",
        },
        { status: 400 }
      );
    }

    // Validate amount
    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < 0
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Amount must be a valid number greater than or equal to zero.",
        },
        { status: 400 }
      );
    }

    // Validate expiration date
    if (
      expirationDate &&
      expirationDate < effectiveDate
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Expiration date cannot be earlier than the effective date.",
        },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Check duplicate fee code
      const duplicateResult = await client.query(
        `
        SELECT fee_id
        FROM mt_fees
        WHERE fee_code = $1
        LIMIT 1
        `,
        [feeCode]
      );

      if ((duplicateResult.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            success: false,
            message:
              "That fee code is already registered.",
          },
          { status: 409 }
        );
      }

      // Insert fee
      const result = await client.query(
        `
        INSERT INTO mt_fees (
          fee_code,
          fee_name,
          fee_type,
          amount,
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
          $8
        )
        RETURNING
          fee_id,
          fee_code,
          fee_name,
          fee_type,
          amount,
          effective_date,
          expiration_date,
          description,
          is_active
        `,
        [
          feeCode,
          feeName,
          feeType,
          numericAmount,
          effectiveDate,
          expirationDate,
          description,
          isActive,
        ]
      );

      await client.query("COMMIT");

      return Response.json(
        {
          success: true,
          message: "Fee saved successfully.",
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
    console.error(
      "Failed to save fee:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          "The fee could not be saved.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const feeId =
      typeof body.fee_id === "string"
        ? body.fee_id.trim()
        : "";

    const feeCode =
      typeof body.fee_code === "string"
        ? body.fee_code.trim().toUpperCase()
        : "";

    const feeName =
      typeof body.fee_name === "string"
        ? body.fee_name.trim()
        : "";

    const feeType =
      typeof body.fee_type === "string"
        ? body.fee_type.trim().toUpperCase()
        : "";

    const amount = body.amount;

    const effectiveDate =
      typeof body.effective_date === "string"
        ? body.effective_date
        : "";

    const expirationDate =
      typeof body.expiration_date === "string" &&
      body.expiration_date.trim() !== ""
        ? body.expiration_date
        : null;

    const description =
      typeof body.description === "string"
        ? body.description.trim() || null
        : null;

    const isActive =
      typeof body.is_active === "boolean"
        ? body.is_active
        : true;

    // Required fields
    if (
      !feeId ||
      !feeCode ||
      !feeName ||
      !feeType ||
      amount === undefined ||
      amount === null ||
      !effectiveDate
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Please complete all required fields.",
        },
        { status: 400 }
      );
    }

    // Validate amount
    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < 0
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Amount must be a valid number greater than or equal to zero.",
        },
        { status: 400 }
      );
    }

    // Validate dates
    if (
      expirationDate &&
      expirationDate < effectiveDate
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Expiration date cannot be earlier than the effective date.",
        },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Make sure the fee exists
      const existingFee = await client.query(
        `
        SELECT fee_id
        FROM mt_fees
        WHERE fee_id = $1
        LIMIT 1
        `,
        [feeId]
      );

      if ((existingFee.rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            success: false,
            message: "Fee record was not found.",
          },
          { status: 404 }
        );
      }

      // Check if another fee already uses this fee code
      const duplicateResult = await client.query(
        `
        SELECT fee_id
        FROM mt_fees
        WHERE fee_code = $1
          AND fee_id <> $2
        LIMIT 1
        `,
        [feeCode, feeId]
      );

      if ((duplicateResult.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            success: false,
            message:
              "That fee code is already registered to another fee.",
          },
          { status: 409 }
        );
      }

      // Update fee
      const result = await client.query(
        `
        UPDATE mt_fees
        SET
          fee_code = $1,
          fee_name = $2,
          fee_type = $3,
          amount = $4,
          effective_date = $5,
          expiration_date = $6,
          description = $7,
          is_active = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE fee_id = $9
        RETURNING
          fee_id,
          fee_code,
          fee_name,
          fee_type,
          amount,
          effective_date,
          expiration_date,
          description,
          is_active
        `,
        [
          feeCode,
          feeName,
          feeType,
          numericAmount,
          effectiveDate,
          expirationDate,
          description,
          isActive,
          feeId,
        ]
      );

      await client.query("COMMIT");

      return Response.json(
        {
          success: true,
          message: "Fee updated successfully.",
          data: result.rows[0],
        },
        { status: 200 }
      );

    } catch (error) {
      await client.query("ROLLBACK");
      throw error;

    } finally {
      client.release();
    }

  } catch (error) {
    console.error(
      "Failed to update fee:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          "The fee could not be updated.",
      },
      { status: 500 }
    );
  }
}

