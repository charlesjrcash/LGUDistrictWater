import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";
type Context = { params: Promise<{ billPenaltyId: string }> };
const fail = (message: string, status: number) => Response.json({ success: false, message }, { status });

export async function GET(_: Request, { params }: Context) {
  const auth = await requirePermission("BILL_VIEW");
  if (auth.response) return auth.response;
  const id = (await params).billPenaltyId;
  if (!/^\d+$/.test(id)) return fail("Bill penalty not found.", 404);
  try { const result = await db.query(`SELECT bp.bill_penalty_id AS "billPenaltyId",bp.bill_id AS "billId",b.bill_no AS "billNo",b.bill_date::text AS "billDate",b.due_date::text AS "dueDate",b.status AS "billStatus",b.service_account_id AS "serviceAccountId",COALESCE(per.period_name,per.period_code) AS "billingPeriod",sa.control_no AS "controlNo",c.customer_name AS "customerName",pr.penalty_id AS "penaltyId",pr.penalty_code AS "penaltyCode",pr.penalty_name AS "penaltyName",pr.penalty_type AS "penaltyType",pr.description AS "penaltyDescription",bp.base_amount::text AS "baseAmount",bp.rate::text,bp.amount::text,bp.created_at::text AS "createdAt" FROM bill_penalties bp INNER JOIN bills b ON b.bill_id=bp.bill_id INNER JOIN service_accounts sa ON sa.service_account_id=b.service_account_id INNER JOIN customers c ON c.customer_id=sa.customer_id INNER JOIN mt_billing_period per ON per.billing_period_id=b.billing_period_id INNER JOIN mt_penalty_rates pr ON pr.penalty_id=bp.penalty_id WHERE bp.bill_penalty_id=$1`, [id]); if (!result.rows[0]) return fail("Bill penalty not found.", 404); return Response.json({ success: true, data: result.rows[0] }); } catch (error) { console.error("Unable to load bill penalty:", error); return fail("Unable to load bill penalty.", 500); }
}
