import { db } from "@/lib/db";
import { requireAnyPermission } from "@/lib/permissions";

export const runtime = "nodejs";
const clean = (value: string | null) => (value || "").trim().slice(0, 100);

export async function GET(request: Request) {
  const auth = await requireAnyPermission(["METER_INSTALLATION_CREATE", "METER_INSTALLATION_EDIT"]);
  if (auth.response) return auth.response;
  const search = clean(new URL(request.url).searchParams.get("search"));
  const values: unknown[] = ["ACTIVE"];
  const where = ["cs.status_code=$1"];
  if (search) { values.push(`%${search}%`); where.push(`(sa.control_no ILIKE $2 OR c.customer_name ILIKE $2 OR COALESCE(sa.address,c.address,'') ILIKE $2 OR COALESCE(m.meter_no,'') ILIKE $2)`); }
  try {
    const result = await db.query(`SELECT sa.service_account_id::text AS "serviceAccountId",sa.control_no AS "controlNo",c.customer_name AS "customerName",COALESCE(sa.address,c.address) AS address,cs.status_name AS status,COALESCE(m.meter_no,'—') AS "meterNo" FROM service_accounts sa JOIN customers c ON c.customer_id=sa.customer_id JOIN mt_connection_status cs ON cs.connection_status_id=sa.connection_status_id LEFT JOIN LATERAL (SELECT meter_no FROM meters WHERE service_account_id=sa.service_account_id ORDER BY meter_id DESC LIMIT 1) m ON TRUE WHERE ${where.join(" AND ")} ORDER BY sa.control_no LIMIT 50`, values);
    return Response.json({ success: true, data: result.rows });
  } catch (error) { console.error("Unable to browse active service accounts:", error); return Response.json({ success: false, message: "Unable to load service accounts." }, { status: 500 }); }
}
