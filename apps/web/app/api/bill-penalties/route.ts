import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";
const fail = (message: string, status: number) => Response.json({ success: false, message }, { status });
const clean = (value: string | null, maximum = 100) => (value || "").trim().slice(0, maximum);

export async function GET(request: Request) {
  const auth = await requirePermission("BILL_VIEW");
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams, billId = clean(params.get("billId"), 30), search = clean(params.get("search")), period = clean(params.get("billingPeriod"), 30), penaltyId = clean(params.get("penaltyId"), 30);
  const values: unknown[] = [], where: string[] = [];
  for (const [value, clause, fuzzy] of [[billId, "bp.bill_id::text=$", false], [search, "(b.bill_no ILIKE $ OR sa.control_no ILIKE $ OR c.customer_name ILIKE $ OR pr.penalty_name ILIKE $)", true], [period, "b.billing_period_id::text=$", false], [penaltyId, "bp.penalty_id::text=$", false]] as const) if (value) { values.push(fuzzy ? `%${value}%` : value); where.push(clause.replaceAll("$", `$${values.length}`)); }
  try { const result = await db.query(`SELECT bp.bill_penalty_id AS "billPenaltyId",bp.bill_id AS "billId",b.bill_no AS "billNo",b.billing_period_id AS "billingPeriodId",COALESCE(per.period_name,per.period_code) AS "billingPeriod",sa.control_no AS "controlNo",c.customer_name AS "customerName",pr.penalty_id AS "penaltyId",pr.penalty_code AS "penaltyCode",pr.penalty_name AS "penaltyName",bp.base_amount::text AS "baseAmount",bp.rate::text,bp.amount::text,bp.created_at::text AS "createdAt" FROM bill_penalties bp INNER JOIN bills b ON b.bill_id=bp.bill_id INNER JOIN service_accounts sa ON sa.service_account_id=b.service_account_id INNER JOIN customers c ON c.customer_id=sa.customer_id INNER JOIN mt_billing_period per ON per.billing_period_id=b.billing_period_id INNER JOIN mt_penalty_rates pr ON pr.penalty_id=bp.penalty_id ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY b.bill_no,bp.bill_penalty_id`, values); return Response.json({ success: true, data: result.rows }); } catch (error) { console.error("Unable to load bill penalties:", error); return fail("Unable to load bill penalties.", 500); }
}
