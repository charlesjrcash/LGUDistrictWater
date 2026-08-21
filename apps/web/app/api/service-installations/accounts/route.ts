import { db } from "@/lib/db";
import { requireAnyPermission } from "@/lib/permissions";

export const runtime = "nodejs";
const clean = (value: string | null) => (value || "").trim().slice(0, 100);

export async function GET(request: Request) {
  const auth = await requireAnyPermission(["METER_INSTALLATION_CREATE", "METER_INSTALLATION_EDIT"]); if (auth.response) return auth.response;
  const search = clean(new URL(request.url).searchParams.get("search"));
  const values: unknown[] = [];
  const where = search ? (() => { values.push(`%${search}%`); return `WHERE sa.control_no ILIKE $1 OR c.customer_name ILIKE $1 OR COALESCE(m.meter_no,'') ILIKE $1 OR COALESCE(sa.address,'') ILIKE $1`; })() : "";
  try {
    const result = await db.query(`SELECT sa.service_account_id::text AS "serviceAccountId",sa.control_no AS "controlNo",c.customer_name AS "customerName",COALESCE(sa.address,c.address) AS address,COALESCE(cs.status_name,cs.status_code,'Not set') AS status,COALESCE(m.meter_no,'—') AS "meterNo" FROM service_accounts sa JOIN customers c ON c.customer_id=sa.customer_id LEFT JOIN mt_connection_status cs ON cs.connection_status_id=sa.connection_status_id LEFT JOIN LATERAL (SELECT meter_no FROM meters WHERE service_account_id=sa.service_account_id ORDER BY meter_id DESC LIMIT 1) m ON TRUE ${where} ORDER BY sa.control_no LIMIT 50`, values);
    return Response.json({ success: true, data: result.rows });
  } catch (error) { console.error("Unable to browse service accounts:", error); return Response.json({ success: false, message: "Unable to load service accounts." }, { status: 500 }); }
}
