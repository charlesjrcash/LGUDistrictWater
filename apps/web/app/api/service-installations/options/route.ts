import { db } from "@/lib/db";
import { requireAnyPermission } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAnyPermission(["METER_INSTALLATION_CREATE", "METER_INSTALLATION_EDIT"]); if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const serviceAccountId = (params.get("serviceAccountId") || "").trim();
  const installationId = (params.get("installationId") || "").trim();
  if (serviceAccountId && !/^\d+$/.test(serviceAccountId)) return Response.json({ success: false, message: "Invalid service account." }, { status: 400 });
  try {
    const [employees, meters] = await Promise.all([
      db.query(`SELECT e.employee_id::text AS id,e.employee_name AS name FROM mt_employee e WHERE e.is_active=TRUE OR e.employee_id IN (SELECT inspector_id FROM service_installations WHERE installation_id=$1 UNION SELECT installer_id FROM service_installations WHERE installation_id=$1) ORDER BY e.employee_name`, [/^\d+$/.test(installationId) ? installationId : "0"]),
      serviceAccountId ? db.query(`SELECT m.meter_id::text AS id,m.meter_no AS "meterNo",ms.meter_size AS "meterSize",m.status FROM meters m JOIN mt_meter_size ms ON ms.meter_size_id=m.meter_size_id WHERE m.service_account_id=$1 ORDER BY m.meter_no`, [serviceAccountId]) : Promise.resolve({ rows: [] }),
    ]);
    return Response.json({ success: true, data: { employees: employees.rows, meters: meters.rows } });
  } catch (error) { console.error("Unable to load service installation options:", error); return Response.json({ success: false, message: "Unable to load installation options." }, { status: 500 }); }
}
