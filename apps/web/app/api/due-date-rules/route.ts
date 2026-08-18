import { Pool } from "pg";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as { dueDateRulesPool?: Pool };
const pool = globalForDb.dueDateRulesPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.dueDateRulesPool = pool;
}

interface DueDateRuleInput {
  ruleName: string;
  ruleType: string;
  daysAfterBilling: number | null;
  fixedDay: number | null;
  description: string | null;
  isActive: boolean;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseOptionalInteger(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isInteger(numberValue) ? numberValue : Number.NaN;
}

function parseDueDateRule(body: Record<string, unknown>) {
  const dueDateRule: DueDateRuleInput = {
    ruleName: getString(body.rule_name),
    ruleType: getString(body.rule_type).toUpperCase(),
    daysAfterBilling: parseOptionalInteger(body.days_after_billing),
    fixedDay: parseOptionalInteger(body.fixed_day),
    description: getString(body.description) || null,
    isActive: body.is_active as boolean,
  };

  if (!dueDateRule.ruleName || !dueDateRule.ruleType) {
    return { error: "Please complete all required fields." };
  }

  if (dueDateRule.daysAfterBilling !== null &&
    (!Number.isInteger(dueDateRule.daysAfterBilling) ||
      dueDateRule.daysAfterBilling < 0)) {
    return {
      error: "Days after billing must be a whole number greater than or equal to zero.",
    };
  }

  if (dueDateRule.fixedDay !== null &&
    (!Number.isInteger(dueDateRule.fixedDay) || dueDateRule.fixedDay < 1 ||
      dueDateRule.fixedDay > 31)) {
    return { error: "Fixed day must be a whole number from 1 to 31." };
  }

  if (typeof body.is_active !== "boolean") {
    return { error: "Active status must be selected." };
  }

  return { dueDateRule };
}

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT rule_id, rule_name, rule_type, days_after_billing, fixed_day,
        description, is_active
      FROM mt_due_date_rule
      ORDER BY rule_name;
    `);
    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Failed to load due date rules:", error);
    return Response.json(
      { success: false, message: "Unable to load due date rules." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const parsed = parseDueDateRule(await request.json());
    if ("error" in parsed) {
      return Response.json({ success: false, message: parsed.error }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(`
        INSERT INTO mt_due_date_rule (
          rule_name, rule_type, days_after_billing, fixed_day, description, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING rule_id, rule_name, rule_type, days_after_billing, fixed_day,
          description, is_active
      `, [
        parsed.dueDateRule.ruleName,
        parsed.dueDateRule.ruleType,
        parsed.dueDateRule.daysAfterBilling,
        parsed.dueDateRule.fixedDay,
        parsed.dueDateRule.description,
        parsed.dueDateRule.isActive,
      ]);
      await client.query("COMMIT");
      return Response.json({
        success: true,
        message: "Due date rule created successfully.",
        data: result.rows[0],
      }, { status: 201 });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to save due date rule:", error);
    return Response.json(
      { success: false, message: "The due date rule could not be saved." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const ruleId = getString(body.rule_id);
    const parsed = parseDueDateRule(body);

    if (!/^\d+$/.test(ruleId)) {
      return Response.json({ success: false, message: "Due date rule ID is required." }, { status: 400 });
    }
    if ("error" in parsed) {
      return Response.json({ success: false, message: parsed.error }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        `SELECT rule_id FROM mt_due_date_rule WHERE rule_id = $1 LIMIT 1`,
        [ruleId]
      );
      if ((existing.rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");
        return Response.json(
          { success: false, message: "Due date rule record was not found." },
          { status: 404 }
        );
      }

      const result = await client.query(`
        UPDATE mt_due_date_rule SET
          rule_name = $1, rule_type = $2, days_after_billing = $3,
          fixed_day = $4, description = $5, is_active = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE rule_id = $7
        RETURNING rule_id, rule_name, rule_type, days_after_billing, fixed_day,
          description, is_active
      `, [
        parsed.dueDateRule.ruleName,
        parsed.dueDateRule.ruleType,
        parsed.dueDateRule.daysAfterBilling,
        parsed.dueDateRule.fixedDay,
        parsed.dueDateRule.description,
        parsed.dueDateRule.isActive,
        ruleId,
      ]);
      await client.query("COMMIT");
      return Response.json({
        success: true,
        message: "Due date rule updated successfully.",
        data: result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to update due date rule:", error);
    return Response.json(
      { success: false, message: "The due date rule could not be updated." },
      { status: 500 }
    );
  }
}
