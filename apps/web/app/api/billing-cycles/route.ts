import { Pool } from "pg";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as {
  billingCyclesPool?: Pool;
};

const pool =
  globalForDb.billingCyclesPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.billingCyclesPool = pool;
}

interface BillingCycleInput {
  cycleCode: string;
  cycleName: string;
  numberOfDays: number | null;
  description: string | null;
  isActive: boolean;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isDuplicateCycleCodeError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function parseBillingCycle(body: Record<string, unknown>) {
  const numberOfDaysValue = body.number_of_days;
  const numberOfDaysIsEmpty =
    numberOfDaysValue === "" ||
    numberOfDaysValue === null ||
    numberOfDaysValue === undefined;
  const numberOfDays = numberOfDaysIsEmpty ? null : Number(numberOfDaysValue);

  const billingCycle: BillingCycleInput = {
    cycleCode: getString(body.cycle_code).toUpperCase(),
    cycleName: getString(body.cycle_name),
    numberOfDays,
    description: getString(body.description) || null,
    isActive: body.is_active as boolean,
  };

  if (!billingCycle.cycleCode || !billingCycle.cycleName) {
    return { error: "Please complete all required fields." };
  }

  if (!numberOfDaysIsEmpty && !Number.isInteger(numberOfDays)) {
    return {
      error: "Number of days must be a valid whole number.",
    };
  }

  if (typeof body.is_active !== "boolean") {
    return { error: "Active status must be selected." };
  }

  return { billingCycle };
}

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        billing_cycle_id,
        cycle_code,
        cycle_name,
        number_of_days,
        description,
        is_active
      FROM mt_billing_cycle
      ORDER BY cycle_code;
    `);

    return Response.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Failed to load billing cycles:", error);

    return Response.json(
      {
        success: false,
        message: "Unable to load billing cycles.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseBillingCycle(body);

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
        `
          SELECT billing_cycle_id
          FROM mt_billing_cycle
          WHERE cycle_code = $1
          LIMIT 1
        `,
        [parsed.billingCycle.cycleCode],
      );

      if ((duplicateResult.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            success: false,
            message: "That cycle code is already registered.",
          },
          { status: 409 },
        );
      }

      const result = await client.query(
        `
          INSERT INTO mt_billing_cycle (
            cycle_code,
            cycle_name,
            number_of_days,
            description,
            is_active
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING
            billing_cycle_id,
            cycle_code,
            cycle_name,
            number_of_days,
            description,
            is_active
        `,
        [
          parsed.billingCycle.cycleCode,
          parsed.billingCycle.cycleName,
          parsed.billingCycle.numberOfDays,
          parsed.billingCycle.description,
          parsed.billingCycle.isActive,
        ],
      );

      await client.query("COMMIT");

      return Response.json(
        {
          success: true,
          message: "Billing cycle created successfully.",
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
    console.error("Failed to save billing cycle:", error);

    if (isDuplicateCycleCodeError(error)) {
      return Response.json(
        {
          success: false,
          message: "That cycle code is already registered.",
        },
        { status: 409 },
      );
    }

    return Response.json(
      {
        success: false,
        message: "The billing cycle could not be saved.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const billingCycleId = getString(body.billing_cycle_id);
    const parsed = parseBillingCycle(body);

    if (!/^\d+$/.test(billingCycleId)) {
      return Response.json(
        {
          success: false,
          message: "Billing cycle ID is required.",
        },
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
        `
          SELECT billing_cycle_id
          FROM mt_billing_cycle
          WHERE billing_cycle_id = $1
          LIMIT 1
        `,
        [billingCycleId],
      );

      if ((existingResult.rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            success: false,
            message: "Billing cycle record was not found.",
          },
          { status: 404 },
        );
      }

      const duplicateResult = await client.query(
        `
          SELECT billing_cycle_id
          FROM mt_billing_cycle
          WHERE cycle_code = $1
            AND billing_cycle_id <> $2
          LIMIT 1
        `,
        [parsed.billingCycle.cycleCode, billingCycleId],
      );

      if ((duplicateResult.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            success: false,
            message:
              "That cycle code is already registered to another billing cycle.",
          },
          { status: 409 },
        );
      }

      const result = await client.query(
        `
          UPDATE mt_billing_cycle
          SET
            cycle_code = $1,
            cycle_name = $2,
            number_of_days = $3,
            description = $4,
            is_active = $5,
            updated_at = CURRENT_TIMESTAMP
          WHERE billing_cycle_id = $6
          RETURNING
            billing_cycle_id,
            cycle_code,
            cycle_name,
            number_of_days,
            description,
            is_active
        `,
        [
          parsed.billingCycle.cycleCode,
          parsed.billingCycle.cycleName,
          parsed.billingCycle.numberOfDays,
          parsed.billingCycle.description,
          parsed.billingCycle.isActive,
          billingCycleId,
        ],
      );

      await client.query("COMMIT");

      return Response.json({
        success: true,
        message: "Billing cycle updated successfully.",
        data: result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to update billing cycle:", error);

    if (isDuplicateCycleCodeError(error)) {
      return Response.json(
        {
          success: false,
          message:
            "That cycle code is already registered to another billing cycle.",
        },
        { status: 409 },
      );
    }

    return Response.json(
      {
        success: false,
        message: "The billing cycle could not be updated.",
      },
      { status: 500 },
    );
  }
}
