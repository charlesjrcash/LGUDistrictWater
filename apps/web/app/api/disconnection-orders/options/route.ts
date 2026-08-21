import { db } from "@/lib/db";
import { requireAnyPermission } from "@/lib/permissions";

export const runtime = "nodejs";
export async function GET() {
  const auth = await requireAnyPermission(["METER_INSTALLATION_CREATE", "METER_INSTALLATION_EDIT"]);
  if (auth.response) return auth.response;
  try {
    const [reasons, employees] = await Promise.all([
      db.query(`SELECT reason_id::text AS "reasonId",reason_code AS "reasonCode",reason_name AS "reasonName" FROM mt_disconnection_reason WHERE is_active=TRUE ORDER BY reason_name`),
      db.query(`SELECT employee_id::text AS "employeeId",employee_code AS "employeeCode",employee_name AS "employeeName" FROM mt_employee WHERE is_active=TRUE ORDER BY employee_name`),
    ]);
    return Response.json({ success: true, data: { reasons: reasons.rows, employees: employees.rows } });
  } catch (error) { console.error("Unable to load disconnection order options:", error); return Response.json({ success: false, message: "Unable to load disconnection order options." }, { status: 500 }); }
}
