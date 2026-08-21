import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";

const fail = (message: string, status: number) => Response.json({ success: false, message }, { status });
const text = (value: unknown, maximum = 4000) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
const date = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

type OrderInput = { serviceAccountId: string; reasonId: string; orderDate: string; remarks: string | null };
function parse(body: Record<string, unknown>) {
  const value: OrderInput = { serviceAccountId: text(body.serviceAccountId, 30), reasonId: text(body.reasonId, 30), orderDate: text(body.orderDate, 10), remarks: text(body.remarks) || null };
  const errors: Record<string, string> = {};
  if (!/^\d+$/.test(value.serviceAccountId)) errors.serviceAccountId = "Select a service account.";
  if (!/^\d+$/.test(value.reasonId)) errors.reasonId = "Select a disconnection reason.";
  if (!date(value.orderDate)) errors.orderDate = "Enter a valid order date.";
  return { value, errors };
}

export async function GET(request: Request) {
  const auth = await requirePermission("METER_INSTALLATION_VIEW");
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const search = text(params.get("search"), 100);
  const status = text(params.get("status"), 20).toUpperCase();
  const values: unknown[] = [];
  const where: string[] = [];
  if (["PENDING", "COMPLETED", "CANCELLED"].includes(status)) { values.push(status); where.push(`o.status=$${values.length}`); }
  if (search) { values.push(`%${search}%`); where.push(`(sa.control_no ILIKE $${values.length} OR c.customer_name ILIKE $${values.length})`); }
  try {
    const result = await db.query(`SELECT o.disconnection_id::text AS "disconnectionId", o.service_account_id::text AS "serviceAccountId", sa.control_no AS "controlNo", c.customer_name AS "customerName", r.reason_id::text AS "reasonId", r.reason_code AS "reasonCode", r.reason_name AS "reasonName", o.order_date::text AS "orderDate", o.disconnection_date::text AS "disconnectionDate", o.status, o.performed_by::text AS "performedById", e.employee_name AS "performedBy", o.remarks, o.created_at::text AS "createdAt" FROM disconnection_orders o JOIN service_accounts sa ON sa.service_account_id=o.service_account_id JOIN customers c ON c.customer_id=sa.customer_id JOIN mt_disconnection_reason r ON r.reason_id=o.reason_id LEFT JOIN mt_employee e ON e.employee_id=o.performed_by ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY o.order_date DESC,o.disconnection_id DESC`, values);
    return Response.json({ success: true, data: result.rows });
  } catch (error) { console.error("Unable to load disconnection orders:", error); return fail("Unable to load disconnection orders.", 500); }
}

export async function POST(request: Request) {
  const auth = await requirePermission("METER_INSTALLATION_CREATE");
  if (auth.response) return auth.response;
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return fail("Invalid request.", 400); }
  const { value, errors } = parse(body);
  if (Object.keys(errors).length) return Response.json({ success: false, message: "Please complete the required order information.", errors }, { status: 400 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const [account, reason] = await Promise.all([
      client.query(`SELECT sa.service_account_id FROM service_accounts sa JOIN mt_connection_status cs ON cs.connection_status_id=sa.connection_status_id WHERE sa.service_account_id=$1 AND cs.status_code='ACTIVE' FOR UPDATE`, [value.serviceAccountId]),
      client.query("SELECT reason_id FROM mt_disconnection_reason WHERE reason_id=$1 AND is_active=TRUE", [value.reasonId]),
    ]);
    if (!account.rows[0]) throw new Error("ACCOUNT_NOT_ACTIVE");
    if (!reason.rows[0]) throw new Error("REASON_UNAVAILABLE");
    const duplicate = await client.query("SELECT disconnection_id FROM disconnection_orders WHERE service_account_id=$1 AND status='PENDING'", [value.serviceAccountId]);
    if (duplicate.rows[0]) throw new Error("DUPLICATE_PENDING");
    const result = await client.query(`INSERT INTO disconnection_orders(service_account_id,reason_id,order_date,status,remarks,created_by,created_at) VALUES($1,$2,$3::date,'PENDING',$4,$5,CURRENT_TIMESTAMP) RETURNING disconnection_id::text AS "disconnectionId"`, [value.serviceAccountId, value.reasonId, value.orderDate, value.remarks, auth.user.userId]);
    await client.query("COMMIT");
    return Response.json({ success: true, data: result.rows[0], message: "Disconnection order created successfully." }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    const code = error instanceof Error ? error.message : "";
    const known: Record<string, [string, number]> = { ACCOUNT_NOT_ACTIVE: ["Only active service accounts can be disconnected.", 400], REASON_UNAVAILABLE: ["The selected disconnection reason is unavailable.", 400], DUPLICATE_PENDING: ["This service account already has a pending disconnection order.", 409] };
    if (known[code]) return fail(...known[code]);
    console.error("Unable to create disconnection order:", error); return fail("Unable to create the disconnection order.", 500);
  } finally { client.release(); }
}
