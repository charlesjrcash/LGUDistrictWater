import { db } from "@/lib/db";
import { requireAnyPermission } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAnyPermission(["METER_INSTALLATION_CREATE", "METER_INSTALLATION_EDIT"]); if (auth.response) return auth.response;
  try { const [accounts, meters] = await Promise.all([db.query(`SELECT sa.service_account_id AS id, sa.control_no AS "controlNo", c.customer_name AS "customerName" FROM service_accounts sa INNER JOIN customers c ON c.customer_id=sa.customer_id ORDER BY sa.control_no`), db.query(`SELECT m.meter_id AS id, m.meter_no AS "meterNo", m.service_account_id AS "serviceAccountId", sa.control_no AS "controlNo" FROM meters m INNER JOIN service_accounts sa ON sa.service_account_id=m.service_account_id ORDER BY m.meter_no`)]); return Response.json({ success: true, data: { accounts: accounts.rows, meters: meters.rows } }); } catch (error) { console.error("Unable to load meter installation options:", error); return Response.json({ success: false, message: "Unable to load meter installation options." }, { status: 500 }); }
}
