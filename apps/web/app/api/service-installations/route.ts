import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";

const STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
type Status = (typeof STATUSES)[number];
type Input = { serviceAccountId: string; scheduledDate: string | null; installationDate: string | null; meterId: string | null; inspectorId: string | null; installerId: string | null; installationStatus: Status | ""; remarks: string | null };
const text = (value: unknown, max = 4000) => typeof value === "string" ? value.trim().slice(0, max) : "";
const date = (value: unknown) => text(value, 10) || null;
const id = (value: unknown) => { const result = text(value, 30); return result || null; };
const isDate = (value: string | null) => value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const fail = (message: string, status: number) => Response.json({ success: false, message }, { status });

function parse(body: Record<string, unknown>) {
  const value: Input = { serviceAccountId: text(body.serviceAccountId, 30), scheduledDate: date(body.scheduledDate), installationDate: date(body.installationDate), meterId: id(body.meterId), inspectorId: id(body.inspectorId), installerId: id(body.installerId), installationStatus: text(body.installationStatus, 30).toUpperCase() as Status | "", remarks: text(body.remarks) || null };
  const errors: Record<string, string> = {};
  if (!/^\d+$/.test(value.serviceAccountId)) errors.serviceAccountId = "Select a service account.";
  for (const [key, item] of [["scheduledDate", value.scheduledDate], ["installationDate", value.installationDate]] as const) if (item && !isDate(item)) errors[key] = "Enter a valid date.";
  for (const [key, item] of [["meterId", value.meterId], ["inspectorId", value.inspectorId], ["installerId", value.installerId]] as const) if (item && !/^\d+$/.test(item)) errors[key] = "Select a valid record.";
  if (!STATUSES.includes(value.installationStatus as Status)) errors.installationStatus = "Select a valid installation status.";
  if (["SCHEDULED", "IN_PROGRESS"].includes(value.installationStatus) && !value.scheduledDate) errors.scheduledDate = "A scheduled date is required for this status.";
  if (value.installationStatus === "COMPLETED") {
    if (!value.installationDate) errors.installationDate = "An installation date is required to complete an installation.";
    if (!value.meterId) errors.meterId = "A meter is required to complete an installation.";
    if (!value.installerId) errors.installerId = "An installer is required to complete an installation.";
  }
  return { value, errors };
}

async function referencesAreValid(value: Input, existing?: { inspectorId: string | null; installerId: string | null }) {
  const account = await db.query("SELECT service_account_id FROM service_accounts WHERE service_account_id=$1", [value.serviceAccountId]);
  if (!account.rows[0]) return "The selected service account is unavailable.";
  if (value.meterId) {
    const meter = await db.query("SELECT meter_id FROM meters WHERE meter_id=$1 AND service_account_id=$2", [value.meterId, value.serviceAccountId]);
    if (!meter.rows[0]) return "Select a meter assigned to the selected service account.";
  }
  for (const [label, employeeId, existingId] of [["Inspector", value.inspectorId, existing?.inspectorId], ["Installer", value.installerId, existing?.installerId]] as const) {
    if (!employeeId) continue;
    const employee = await db.query("SELECT employee_id FROM mt_employee WHERE employee_id=$1 AND (is_active=TRUE OR employee_id=$2)", [employeeId, existingId || "0"]);
    if (!employee.rows[0]) return `${label} must be an active employee.`;
  }
  return null;
}

export async function GET(request: Request) {
  const auth = await requirePermission("METER_INSTALLATION_VIEW"); if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const search = text(params.get("search"), 100);
  const status = text(params.get("status"), 30).toUpperCase();
  const values: unknown[] = [];
  const where: string[] = [];
  if (search) { values.push(`%${search}%`); where.push(`(sa.control_no ILIKE $${values.length} OR c.customer_name ILIKE $${values.length} OR COALESCE(m.meter_no,'') ILIKE $${values.length})`); }
  if (STATUSES.includes(status as Status)) { values.push(status); where.push(`si.installation_status=$${values.length}`); }
  try {
    const result = await db.query(`SELECT si.installation_id::text AS "installationId",si.service_account_id::text AS "serviceAccountId",sa.control_no AS "controlNo",c.customer_name AS "customerName",COALESCE(sa.address,c.address) AS address,COALESCE(cs.status_name,cs.status_code,'Not set') AS "connectionStatus",si.scheduled_date::text AS "scheduledDate",si.installation_date::text AS "installationDate",si.meter_id::text AS "meterId",m.meter_no AS "meterNo",si.inspector_id::text AS "inspectorId",ins.employee_name AS "inspectorName",si.installer_id::text AS "installerId",inst.employee_name AS "installerName",si.installation_status AS status,si.remarks FROM service_installations si JOIN service_accounts sa ON sa.service_account_id=si.service_account_id JOIN customers c ON c.customer_id=sa.customer_id LEFT JOIN mt_connection_status cs ON cs.connection_status_id=sa.connection_status_id LEFT JOIN meters m ON m.meter_id=si.meter_id LEFT JOIN mt_employee ins ON ins.employee_id=si.inspector_id LEFT JOIN mt_employee inst ON inst.employee_id=si.installer_id ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY COALESCE(si.scheduled_date,si.created_at::date) DESC,si.installation_id DESC`, values);
    return Response.json({ success: true, data: result.rows });
  } catch (error) { console.error("Unable to load service installations:", error); return fail("Unable to load service installations.", 500); }
}

export async function POST(request: Request) {
  const auth = await requirePermission("METER_INSTALLATION_CREATE"); if (auth.response) return auth.response;
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return fail("Invalid request.", 400); }
  const { value, errors } = parse(body); if (Object.keys(errors).length) return Response.json({ success: false, message: "Please correct the installation information.", errors }, { status: 400 });
  try {
    const referenceError = await referencesAreValid(value); if (referenceError) return fail(referenceError, 400);
    const result = await db.query(`INSERT INTO service_installations(service_account_id,scheduled_date,installation_date,meter_id,inspector_id,installer_id,installation_status,remarks,created_by) VALUES($1,$2::date,$3::date,$4,$5,$6,$7,$8,$9) RETURNING installation_id::text AS "installationId"`, [value.serviceAccountId,value.scheduledDate,value.installationDate,value.meterId,value.inspectorId,value.installerId,value.installationStatus,value.remarks,auth.user.userId]);
    return Response.json({ success: true, data: result.rows[0], message: "Service installation created successfully." }, { status: 201 });
  } catch (error) { console.error("Unable to create service installation:", error); return fail("Unable to create the service installation.", 500); }
}
