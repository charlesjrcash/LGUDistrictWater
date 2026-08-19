import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";

const text = (value: unknown, max = 4000) => typeof value === "string" ? value.trim().slice(0, max) : "";
const fail = (message: string, status: number) => Response.json({ success: false, message }, { status });
const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

type InstallationInput = { serviceAccountId: string; meterId: string; installationDate: string; removedDate: string | null; installationType: string | null; reason: string | null; remarks: string | null };
function parse(body: Record<string, unknown>) {
  const value: InstallationInput = { serviceAccountId: text(body.serviceAccountId, 30), meterId: text(body.meterId, 30), installationDate: text(body.installationDate, 10), removedDate: text(body.removedDate, 10) || null, installationType: text(body.installationType, 50) || null, reason: text(body.reason) || null, remarks: text(body.remarks) || null };
  const errors: Record<string, string> = {};
  if (!/^\d+$/.test(value.serviceAccountId)) errors.serviceAccountId = "Select a service account.";
  if (!/^\d+$/.test(value.meterId)) errors.meterId = "Select a meter.";
  if (!isDate(value.installationDate)) errors.installationDate = "Enter a valid installation date.";
  if (value.removedDate && !isDate(value.removedDate)) errors.removedDate = "Enter a valid removal date.";
  if (value.removedDate && isDate(value.installationDate) && value.removedDate < value.installationDate) errors.removedDate = "Removal date cannot be earlier than the installation date.";
  return { value, errors };
}
async function referencesExist(value: InstallationInput) {
  const [account, meter] = await Promise.all([
    db.query("SELECT service_account_id FROM service_accounts WHERE service_account_id=$1", [value.serviceAccountId]),
    db.query("SELECT meter_id FROM meters WHERE meter_id=$1", [value.meterId]),
  ]);
  return Boolean(account.rows[0] && meter.rows[0]);
}

export async function GET(request: Request) {
  const auth = await requirePermission("METER_INSTALLATION_VIEW"); if (auth.response) return auth.response;
  const search = text(new URL(request.url).searchParams.get("search"), 100);
  try {
    const result = await db.query(`SELECT mi.installation_id AS "installationId", mi.service_account_id AS "serviceAccountId", sa.control_no AS "controlNo", c.customer_name AS "customerName", mi.meter_id AS "meterId", m.meter_no AS "meterNo", mi.installation_date::text AS "installationDate", mi.removed_date::text AS "removedDate", mi.installation_type AS "installationType", mi.reason, mi.remarks, CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name) AS "performedBy", mi.created_at::text AS "createdAt" FROM meter_installations mi INNER JOIN service_accounts sa ON sa.service_account_id=mi.service_account_id INNER JOIN customers c ON c.customer_id=sa.customer_id INNER JOIN meters m ON m.meter_id=mi.meter_id LEFT JOIN users u ON u.user_id=mi.performed_by WHERE mi.installation_id::text ILIKE $1 OR sa.control_no ILIKE $1 OR c.customer_name ILIKE $1 OR m.meter_no ILIKE $1 OR COALESCE(mi.installation_type, '') ILIKE $1 ORDER BY mi.installation_date DESC, mi.installation_id DESC`, [`%${search}%`]);
    return Response.json({ success: true, data: result.rows });
  } catch (error) { console.error("Unable to load meter installations:", error); return fail("Unable to load meter installations.", 500); }
}

export async function POST(request: Request) {
  const auth = await requirePermission("METER_INSTALLATION_CREATE"); if (auth.response) return auth.response;
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return fail("Invalid request.", 400); }
  const { value, errors } = parse(body); if (Object.keys(errors).length) return Response.json({ success: false, message: "Please complete the required installation information.", errors }, { status: 400 });
  try {
    if (!(await referencesExist(value))) return fail("The selected service account or meter is unavailable.", 400);
    const result = await db.query(`INSERT INTO meter_installations(service_account_id, meter_id, installation_date, removed_date, installation_type, reason, remarks, performed_by) VALUES($1, $2, $3::date, $4::date, $5, $6, $7, $8) RETURNING installation_id AS "installationId"`, [value.serviceAccountId, value.meterId, value.installationDate, value.removedDate, value.installationType, value.reason, value.remarks, auth.user.userId]);
    return Response.json({ success: true, data: result.rows[0], message: "Meter installation recorded successfully." }, { status: 201 });
  } catch (error) { console.error("Unable to create meter installation:", error); return fail("Unable to record the meter installation.", 500); }
}
