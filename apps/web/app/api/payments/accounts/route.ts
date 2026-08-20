import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";
const clean = (value: string | null, maximum = 100) => (value || "").trim().slice(0, maximum);

export async function GET(request: Request) {
  const auth = await requirePermission("BILL_EDIT");
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const search = clean(params.get("search"));
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(10, Number(params.get("pageSize")) || 20));
  const values: unknown[] = [];
  const where = ["UPPER(COALESCE(cs.status_code,''))='ACTIVE'"];
  if (search) {
    values.push(`%${search}%`);
    where.push(`(sa.control_no ILIKE $${values.length} OR c.customer_name ILIKE $${values.length} OR COALESCE(m.meter_no,'') ILIKE $${values.length} OR COALESCE(sa.address,'') ILIKE $${values.length})`);
  }
  const clause = `WHERE ${where.join(" AND ")}`;
  try {
    const [count, rows] = await Promise.all([
      db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM service_accounts sa JOIN customers c ON c.customer_id=sa.customer_id LEFT JOIN mt_connection_status cs ON cs.connection_status_id=sa.connection_status_id LEFT JOIN LATERAL (SELECT meter_no FROM meters WHERE service_account_id=sa.service_account_id AND UPPER(status)='ACTIVE' ORDER BY meter_id DESC LIMIT 1) m ON TRUE ${clause}`, values),
      db.query(`SELECT sa.service_account_id::text AS "serviceAccountId",sa.control_no AS "controlNo",c.customer_id::text AS "customerId",c.customer_name AS "customerName",sa.address,COALESCE(cs.status_name,cs.status_code,'Not set') AS status,COALESCE(m.meter_no,'—') AS "meterNo",COALESCE(rr.route_code,'—') AS "routeCode" FROM service_accounts sa JOIN customers c ON c.customer_id=sa.customer_id LEFT JOIN mt_connection_status cs ON cs.connection_status_id=sa.connection_status_id LEFT JOIN mt_reading_route rr ON rr.route_id=sa.route_id LEFT JOIN LATERAL (SELECT meter_no FROM meters WHERE service_account_id=sa.service_account_id AND UPPER(status)='ACTIVE' ORDER BY meter_id DESC LIMIT 1) m ON TRUE ${clause} ORDER BY sa.control_no LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, pageSize, (page - 1) * pageSize]),
    ]);
    const total = Number(count.rows[0].count);
    return Response.json({ success: true, data: rows.rows, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
  } catch (error) {
    console.error("Unable to browse service accounts for payment:", error);
    return Response.json({ success: false, message: "Unable to load service accounts. Please try again." }, { status: 500 });
  }
}
