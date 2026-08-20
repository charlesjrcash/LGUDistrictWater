import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";
const fail = (message: string, status: number) => Response.json({ success: false, message }, { status });

export async function POST(request: Request) {
  const auth = await requirePermission("METER_READING_CREATE");
  if (auth.response) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return fail("Invalid request.", 400); }
  const billingPeriodId = typeof body.billing_period_id === "string" || typeof body.billing_period_id === "number" ? String(body.billing_period_id).trim() : "";
  if (!/^\d+$/.test(billingPeriodId)) return fail("Select a valid billing period.", 400);
  try {
    const period = await db.query("SELECT billing_period_id FROM mt_billing_period WHERE billing_period_id=$1 AND UPPER(status)='OPEN'", [billingPeriodId]);
    if (!period.rows[0]) return fail("Meter readings can only be generated for an open billing period.", 409);
    const result = await db.query(`SELECT * FROM public.fn_generate_meter_readings($1::bigint,$2::bigint)`, [billingPeriodId, auth.user.userId]);
    return Response.json({ success: true, data: result.rows[0] || {}, message: "Meter reading generation completed." });
  } catch (error) { console.error("Unable to generate meter readings:", error); return fail("Meter reading generation could not be completed.", 500); }
}
