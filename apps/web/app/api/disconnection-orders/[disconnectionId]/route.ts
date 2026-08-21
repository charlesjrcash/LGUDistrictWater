import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";
type Context = { params: Promise<{ disconnectionId: string }> };
const fail = (message: string, status: number) => Response.json({ success: false, message }, { status });
const text = (value: unknown, maximum = 4000) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
const date = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const id = (value: string) => /^\d+$/.test(value) ? value : null;
const organizationSettingKeys = ["ORG_NAME", "OFFICE_NAME", "ORG_ADDRESS", "ORG_TIN", "ORG_VAT_NO", "ORG_CONTACT_NO", "ORG_EMAIL", "ORG_WEBSITE", "ORG_LOGO_PATH", "REPORT_FOOTER_NOTE"];
const organizationSettingsSql = `SELECT NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='ORG_NAME')),'') AS name,NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='OFFICE_NAME')),'') AS "officeName",NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='ORG_ADDRESS')),'') AS address,NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='ORG_TIN')),'') AS tin,NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='ORG_VAT_NO')),'') AS "vatNo",NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='ORG_CONTACT_NO')),'') AS "contactNo",NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='ORG_EMAIL')),'') AS email,NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='ORG_WEBSITE')),'') AS website,NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='ORG_LOGO_PATH')),'') AS "logoPath",NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='REPORT_FOOTER_NOTE')),'') AS "footerNote" FROM public.mt_system_settings WHERE is_active=TRUE AND setting_key=ANY($1::text[])`;

export async function GET(_: Request, { params }: Context) {
  const auth = await requirePermission("METER_INSTALLATION_VIEW"); if (auth.response) return auth.response;
  const orderId = id((await params).disconnectionId); if (!orderId) return fail("Disconnection order not found.", 404);
  try {
    const result = await db.query(`SELECT o.disconnection_id::text AS "disconnectionId",o.service_account_id::text AS "serviceAccountId",sa.control_no AS "controlNo",c.customer_name AS "customerName",COALESCE(sa.address,c.address) AS address,cs.status_name AS "connectionStatus",COALESCE(m.meter_no,'—') AS "meterNo",o.reason_id::text AS "reasonId",r.reason_code AS "reasonCode",r.reason_name AS "reasonName",o.order_date::text AS "orderDate",o.disconnection_date::text AS "disconnectionDate",o.status,o.performed_by::text AS "performedById",e.employee_name AS "performedBy",o.remarks,o.created_at::text AS "createdAt" FROM disconnection_orders o JOIN service_accounts sa ON sa.service_account_id=o.service_account_id JOIN customers c ON c.customer_id=sa.customer_id JOIN mt_disconnection_reason r ON r.reason_id=o.reason_id LEFT JOIN mt_connection_status cs ON cs.connection_status_id=sa.connection_status_id LEFT JOIN mt_employee e ON e.employee_id=o.performed_by LEFT JOIN LATERAL (SELECT meter_no FROM meters WHERE service_account_id=sa.service_account_id ORDER BY meter_id DESC LIMIT 1) m ON TRUE WHERE o.disconnection_id=$1`, [orderId]);
    if (!result.rows[0]) return fail("Disconnection order not found.", 404);
    const [supplement, organization] = await Promise.all([
      db.query(`SELECT cc.classification_name AS classification,COALESCE(cs.status_name,cs.status_code) AS "connectionStatus",COALESCE(NULLIF(CONCAT_WS(' ',creator.first_name,creator.last_name),''),creator.username,creator.email) AS "preparedBy",o.updated_at::text AS "updatedAt" FROM disconnection_orders o JOIN service_accounts sa ON sa.service_account_id=o.service_account_id LEFT JOIN mt_customer_classification cc ON cc.classification_id=sa.classification_id LEFT JOIN mt_connection_status cs ON cs.connection_status_id=sa.connection_status_id LEFT JOIN users creator ON creator.user_id=o.created_by WHERE o.disconnection_id=$1`, [orderId]),
      db.query(organizationSettingsSql, [organizationSettingKeys]),
    ]);
    return Response.json({ success: true, data: { ...result.rows[0], ...supplement.rows[0], organization: organization.rows[0] } });
  } catch (error) { console.error("Unable to load disconnection order:", error); return fail("Unable to load disconnection order.", 500); }
}

export async function PUT(request: Request, { params }: Context) {
  const auth = await requirePermission("METER_INSTALLATION_EDIT"); if (auth.response) return auth.response;
  const orderId = id((await params).disconnectionId); if (!orderId) return fail("Disconnection order not found.", 404);
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return fail("Invalid request.", 400); }
  const reasonId = text(body.reasonId, 30), orderDate = text(body.orderDate, 10), remarks = text(body.remarks) || null;
  const errors: Record<string, string> = {};
  if (!/^\d+$/.test(reasonId)) errors.reasonId = "Select a disconnection reason.";
  if (!date(orderDate)) errors.orderDate = "Enter a valid order date.";
  if (Object.keys(errors).length) return Response.json({ success: false, message: "Please correct the highlighted fields.", errors }, { status: 400 });
  try {
    const reason = await db.query("SELECT reason_id FROM mt_disconnection_reason WHERE reason_id=$1 AND is_active=TRUE", [reasonId]);
    if (!reason.rows[0]) return fail("The selected disconnection reason is unavailable.", 400);
    const result = await db.query(`UPDATE disconnection_orders SET reason_id=$1,order_date=$2::date,remarks=$3,updated_at=CURRENT_TIMESTAMP WHERE disconnection_id=$4 AND status='PENDING' RETURNING disconnection_id::text AS "disconnectionId"`, [reasonId, orderDate, remarks, orderId]);
    if (!result.rows[0]) return fail("Only pending disconnection orders can be edited.", 409);
    return Response.json({ success: true, data: result.rows[0], message: "Disconnection order updated successfully." });
  } catch (error) { console.error("Unable to update disconnection order:", error); return fail("Unable to update the disconnection order.", 500); }
}
