import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { PATCH as patchInstallation } from "../update";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const fail = (message: string, status: number) => Response.json({ success: false, message }, { status });
const organizationSettingKeys = ["ORG_NAME","OFFICE_NAME","ORG_ADDRESS","ORG_TIN","ORG_VAT_NO","ORG_CONTACT_NO","ORG_EMAIL","ORG_WEBSITE","ORG_LOGO_PATH","REPORT_FOOTER_NOTE"];
const organizationSettingsSql = `SELECT NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='ORG_NAME')),'') AS name,NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='OFFICE_NAME')),'') AS "officeName",NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='ORG_ADDRESS')),'') AS address,NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='ORG_TIN')),'') AS tin,NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='ORG_VAT_NO')),'') AS "vatNo",NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='ORG_CONTACT_NO')),'') AS "contactNo",NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='ORG_EMAIL')),'') AS email,NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='ORG_WEBSITE')),'') AS website,NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='ORG_LOGO_PATH')),'') AS "logoPath",NULLIF(BTRIM(MAX(setting_value) FILTER (WHERE setting_key='REPORT_FOOTER_NOTE')),'') AS "footerNote" FROM public.mt_system_settings WHERE is_active=TRUE AND setting_key=ANY($1::text[])`;

export async function GET(_: Request, { params }: Context) {
  const auth = await requirePermission("METER_INSTALLATION_VIEW"); if (auth.response) return auth.response;
  const installationId = (await params).id; if (!/^\d+$/.test(installationId)) return fail("Service installation not found.", 404);
  try {
    const [result, organization] = await Promise.all([db.query(`SELECT si.installation_id::text AS "installationId",si.service_account_id::text AS "serviceAccountId",sa.control_no AS "controlNo",c.customer_name AS "customerName",COALESCE(sa.address,c.address) AS address,cc.classification_name AS classification,COALESCE(cs.status_name,cs.status_code,'Not set') AS "connectionStatus",si.scheduled_date::text AS "scheduledDate",si.installation_date::text AS "installationDate",si.meter_id::text AS "meterId",m.meter_no AS "meterNo",ms.meter_size AS "meterSize",m.status AS "meterStatus",si.inspector_id::text AS "inspectorId",ins.employee_name AS inspector,si.installer_id::text AS "installerId",inst.employee_name AS installer,si.installation_status AS status,si.remarks,COALESCE(NULLIF(CONCAT_WS(' ',creator.first_name,creator.last_name),''),creator.username,creator.email) AS "preparedBy",si.created_at::text AS "createdAt",COALESCE(NULLIF(CONCAT_WS(' ',updater.first_name,updater.last_name),''),updater.username,updater.email) AS "updatedBy",si.updated_at::text AS "updatedAt" FROM service_installations si JOIN service_accounts sa ON sa.service_account_id=si.service_account_id JOIN customers c ON c.customer_id=sa.customer_id LEFT JOIN mt_customer_classification cc ON cc.classification_id=sa.classification_id LEFT JOIN mt_connection_status cs ON cs.connection_status_id=sa.connection_status_id LEFT JOIN meters m ON m.meter_id=si.meter_id LEFT JOIN mt_meter_size ms ON ms.meter_size_id=m.meter_size_id LEFT JOIN mt_employee ins ON ins.employee_id=si.inspector_id LEFT JOIN mt_employee inst ON inst.employee_id=si.installer_id LEFT JOIN users creator ON creator.user_id=si.created_by LEFT JOIN users updater ON updater.user_id=si.updated_by WHERE si.installation_id=$1`, [installationId]), db.query(organizationSettingsSql, [organizationSettingKeys])]);
    if (!result.rows[0]) return fail("Service installation not found.", 404);
    return Response.json({ success: true, data: { ...result.rows[0], organization: organization.rows[0] } });
  } catch (error) { console.error("Unable to load service installation:", error); return fail("Unable to load the service installation.", 500); }
}

export const PATCH = patchInstallation;
