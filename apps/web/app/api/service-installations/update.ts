import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

const STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
type Status = (typeof STATUSES)[number];
type Context = { params: Promise<{ id: string }> };
const text = (value: unknown, max = 4000) => typeof value === "string" ? value.trim().slice(0, max) : "";
const id = (value: unknown) => { const result = text(value, 30); return result || null; };
const date = (value: unknown) => text(value, 10) || null;
const isDate = (value: string | null) => value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const fail = (message: string, status: number) => Response.json({ success: false, message }, { status });

function parse(body: Record<string, unknown>) {
  const value = { scheduledDate: date(body.scheduledDate), installationDate: date(body.installationDate), meterId: id(body.meterId), inspectorId: id(body.inspectorId), installerId: id(body.installerId), installationStatus: text(body.installationStatus, 30).toUpperCase() as Status | "", remarks: text(body.remarks) || null };
  const errors: Record<string, string> = {};
  for (const [key, item] of [["scheduledDate", value.scheduledDate], ["installationDate", value.installationDate]] as const) if (item && !isDate(item)) errors[key] = "Enter a valid date.";
  for (const [key, item] of [["meterId", value.meterId], ["inspectorId", value.inspectorId], ["installerId", value.installerId]] as const) if (item && !/^\d+$/.test(item)) errors[key] = "Select a valid record.";
  if (!STATUSES.includes(value.installationStatus as Status)) errors.installationStatus = "Select a valid installation status.";
  if (["SCHEDULED", "IN_PROGRESS"].includes(value.installationStatus) && !value.scheduledDate) errors.scheduledDate = "A scheduled date is required for this status.";
  if (value.installationStatus === "COMPLETED") { if (!value.installationDate) errors.installationDate = "An installation date is required to complete an installation."; if (!value.meterId) errors.meterId = "A meter is required to complete an installation."; if (!value.installerId) errors.installerId = "An installer is required to complete an installation."; }
  return { value, errors };
}

export async function PATCH(request: Request, { params }: Context) {
  const auth = await requirePermission("METER_INSTALLATION_EDIT"); if (auth.response) return auth.response;
  const installationId = (await params).id; if (!/^\d+$/.test(installationId)) return fail("Service installation not found.", 404);
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return fail("Invalid request.", 400); }
  const { value, errors } = parse(body); if (Object.keys(errors).length) return Response.json({ success: false, message: "Please correct the installation information.", errors }, { status: 400 });
  try {
    const existing = await db.query<{ serviceAccountId: string; meterId: string | null; installationDate: string | null; inspectorId: string | null; installerId: string | null; status: string }>(`SELECT service_account_id::text AS "serviceAccountId",meter_id::text AS "meterId",installation_date::text AS "installationDate",inspector_id::text AS "inspectorId",installer_id::text AS "installerId",installation_status AS status FROM service_installations WHERE installation_id=$1`, [installationId]);
    const current = existing.rows[0]; if (!current) return fail("Service installation not found.", 404);
    if (current.status === "COMPLETED" && (value.meterId !== current.meterId || value.installationDate !== current.installationDate || value.installationStatus !== "COMPLETED")) return fail("Completed installations cannot have their meter, installation date, or status changed.", 400);
    if (value.meterId) { const meter = await db.query("SELECT meter_id FROM meters WHERE meter_id=$1 AND service_account_id=$2", [value.meterId, current.serviceAccountId]); if (!meter.rows[0]) return fail("Select a meter assigned to this service account.", 400); }
    for (const [label, employeeId, currentId] of [["Inspector", value.inspectorId, current.inspectorId], ["Installer", value.installerId, current.installerId]] as const) { if (!employeeId) continue; const employee = await db.query("SELECT employee_id FROM mt_employee WHERE employee_id=$1 AND (is_active=TRUE OR employee_id=$2)", [employeeId, currentId || "0"]); if (!employee.rows[0]) return fail(`${label} must be an active employee.`, 400); }
    const result = await db.query(`UPDATE service_installations SET scheduled_date=$1::date,installation_date=$2::date,meter_id=$3,inspector_id=$4,installer_id=$5,installation_status=$6,remarks=$7,updated_by=$8,updated_at=CURRENT_TIMESTAMP WHERE installation_id=$9 RETURNING installation_id::text AS "installationId"`, [value.scheduledDate,value.installationDate,value.meterId,value.inspectorId,value.installerId,value.installationStatus,value.remarks,auth.user.userId,installationId]);
    return Response.json({ success: true, data: result.rows[0], message: "Service installation updated successfully." });
  } catch (error) { console.error("Unable to update service installation:", error); return fail("Unable to update the service installation.", 500); }
}
