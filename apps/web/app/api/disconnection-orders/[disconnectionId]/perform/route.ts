import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";
type Context = { params: Promise<{ disconnectionId: string }> };
const fail = (message: string, status: number) => Response.json({ success: false, message }, { status });
const text = (value: unknown, maximum = 4000) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
const date = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export async function POST(request: Request, { params }: Context) {
  const auth = await requirePermission("METER_INSTALLATION_EDIT"); if (auth.response) return auth.response;
  const orderId = (await params).disconnectionId; if (!/^\d+$/.test(orderId)) return fail("Disconnection order not found.", 404);
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return fail("Invalid request.", 400); }
  const disconnectionDate = text(body.disconnectionDate, 10), performedBy = text(body.performedBy, 30), remarks = text(body.remarks) || null;
  const errors: Record<string, string> = {};
  if (!date(disconnectionDate)) errors.disconnectionDate = "Enter a valid disconnection date.";
  if (!/^\d+$/.test(performedBy)) errors.performedBy = "Select the employee who performed the disconnection.";
  if (Object.keys(errors).length) return Response.json({ success: false, message: "Please complete the disconnection details.", errors }, { status: 400 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const order = await client.query<{ serviceAccountId: string }>(`SELECT service_account_id::text AS "serviceAccountId" FROM disconnection_orders WHERE disconnection_id=$1 AND status='PENDING' FOR UPDATE`, [orderId]);
    if (!order.rows[0]) throw new Error("ORDER_NOT_PENDING");
    const [account, employee, disconnected] = await Promise.all([
      client.query(`SELECT sa.service_account_id FROM service_accounts sa JOIN mt_connection_status cs ON cs.connection_status_id=sa.connection_status_id WHERE sa.service_account_id=$1 AND cs.status_code='ACTIVE' FOR UPDATE`, [order.rows[0].serviceAccountId]),
      client.query("SELECT employee_id FROM mt_employee WHERE employee_id=$1 AND is_active=TRUE", [performedBy]),
      client.query<{ id: string }>("SELECT connection_status_id::text AS id FROM mt_connection_status WHERE status_code='DISCONNECTED' AND is_active=TRUE LIMIT 1"),
    ]);
    if (!account.rows[0]) throw new Error("ACCOUNT_NOT_ACTIVE");
    if (!employee.rows[0]) throw new Error("EMPLOYEE_NOT_FOUND");
    const disconnectedId = disconnected.rows[0]?.id; if (!disconnectedId) throw new Error("DISCONNECTED_STATUS_MISSING");
    await client.query(`UPDATE disconnection_orders SET disconnection_date=$1::date,performed_by=$2,status='COMPLETED',remarks=COALESCE($3,remarks),updated_at=CURRENT_TIMESTAMP WHERE disconnection_id=$4`, [disconnectionDate, performedBy, remarks, orderId]);
    await client.query(`UPDATE service_accounts SET connection_status_id=$1,updated_by=$2,updated_at=CURRENT_TIMESTAMP WHERE service_account_id=$3`, [disconnectedId, auth.user.userId, order.rows[0].serviceAccountId]);
    await client.query("COMMIT");
    return Response.json({ success: true, data: { disconnectionId: orderId }, message: "Disconnection completed successfully." });
  } catch (error) {
    await client.query("ROLLBACK");
    const code = error instanceof Error ? error.message : "";
    const known: Record<string, [string, number]> = { ORDER_NOT_PENDING: ["Only pending disconnection orders can be performed.", 409], ACCOUNT_NOT_ACTIVE: ["The service account is no longer active.", 409], EMPLOYEE_NOT_FOUND: ["The selected employee was not found.", 400], DISCONNECTED_STATUS_MISSING: ["The DISCONNECTED connection status is not configured.", 409] };
    if (known[code]) return fail(...known[code]);
    console.error("Unable to perform disconnection:", error); return fail("Unable to perform the disconnection. No changes were made.", 500);
  } finally { client.release(); }
}
