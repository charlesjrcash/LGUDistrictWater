import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";

const clean = (value: string | null, maximum = 100) => (value || "").trim().slice(0, maximum);
const fail = (message: string, status: number) => Response.json({ success: false, message }, { status });

export async function GET(request: Request) {
  const auth = await requirePermission("BILL_VIEW");
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const search = clean(params.get("search")), billNo = clean(params.get("billNo"), 50), controlNo = clean(params.get("controlNo"), 50), period = clean(params.get("billingPeriod"), 30), chargeType = clean(params.get("chargeType"), 50);
  const values: unknown[] = [], where: string[] = [];
  for (const [value, clause, fuzzy] of [[search, "(b.bill_no ILIKE $ OR sa.control_no ILIKE $ OR c.customer_name ILIKE $)", true], [billNo, "b.bill_no=$", false], [controlNo, "sa.control_no=$", false], [period, "b.billing_period_id::text=$", false], [chargeType, "bd.charge_type=$", false]] as const) if (value) { values.push(fuzzy ? `%${value}%` : value); where.push(clause.replaceAll("$", `$${values.length}`)); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  try {
    const result = await db.query(`SELECT bd.bill_detail_id AS "billDetailId",bd.bill_id AS "billId",b.bill_no AS "billNo",sa.control_no AS "controlNo",c.customer_name AS "customerName",b.billing_period_id AS "billingPeriodId",bp.period_code AS "periodCode",COALESCE(bp.period_name,bp.period_code) AS "billingPeriod",bd.charge_type AS "chargeType",bd.description,bd.quantity::text,bd.rate::text,bd.amount::text,bd.sequence_no AS "sequenceNo",bd.created_at::text AS "createdAt" FROM bill_details bd INNER JOIN bills b ON b.bill_id=bd.bill_id INNER JOIN service_accounts sa ON sa.service_account_id=b.service_account_id INNER JOIN customers c ON c.customer_id=sa.customer_id INNER JOIN mt_billing_period bp ON bp.billing_period_id=b.billing_period_id ${whereSql} ORDER BY b.bill_no,bd.sequence_no ASC NULLS LAST,bd.bill_detail_id`, values);
    return Response.json({ success: true, data: result.rows });
  } catch (error) { console.error("Unable to load bill details:", error); return fail("Unable to load bill details.", 500); }
}
