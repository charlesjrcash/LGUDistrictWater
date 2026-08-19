import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";
type Context = { params: Promise<{ billDetailId: string }> };
const fail = (message: string, status: number) => Response.json({ success: false, message }, { status });

export async function GET(_: Request, { params }: Context) {
  const auth = await requirePermission("BILL_VIEW");
  if (auth.response) return auth.response;
  const billDetailId = (await params).billDetailId;
  if (!/^\d+$/.test(billDetailId)) return fail("Bill detail not found.", 404);
  try {
    const result = await db.query(`SELECT bd.bill_detail_id AS "billDetailId",bd.bill_id AS "billId",b.bill_no AS "billNo",b.bill_date::text AS "billDate",b.status AS "billStatus",bp.period_code AS "periodCode",COALESCE(bp.period_name,bp.period_code) AS "billingPeriod",sa.control_no AS "controlNo",c.customer_name AS "customerName",bd.charge_type AS "chargeType",bd.rate_id AS "rateId",bd.description,bd.quantity::text,bd.rate::text,bd.amount::text,bd.sequence_no AS "sequenceNo",bd.created_at::text AS "createdAt",wr.minimum_cubic_meter::text AS "minimumCubicMeter",wr.maximum_cubic_meter::text AS "maximumCubicMeter",wr.rate_type AS "rateType",wr.effective_date::text AS "effectiveDate",wr.expiration_date::text AS "expirationDate" FROM bill_details bd INNER JOIN bills b ON b.bill_id=bd.bill_id INNER JOIN service_accounts sa ON sa.service_account_id=b.service_account_id INNER JOIN customers c ON c.customer_id=sa.customer_id INNER JOIN mt_billing_period bp ON bp.billing_period_id=b.billing_period_id LEFT JOIN mt_water_rates wr ON wr.rate_id=bd.rate_id WHERE bd.bill_detail_id=$1`, [billDetailId]);
    if (!result.rows[0]) return fail("Bill detail not found.", 404);
    return Response.json({ success: true, data: result.rows[0] });
  } catch (error) { console.error("Unable to load bill detail:", error); return fail("Unable to load bill detail.", 500); }
}
