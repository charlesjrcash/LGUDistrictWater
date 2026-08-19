import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";
type Context = { params: Promise<{ readingId: string }> };
const text = (value: unknown, max = 4000) => typeof value === "string" ? value.trim().slice(0, max) : "";
const fail = (message: string, status: number) => Response.json({ success: false, message }, { status });
const isId = (value: string) => /^\d+$/.test(value);
const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const detailSql = `SELECT rd.reading_id AS "readingId", rd.service_account_id AS "serviceAccountId", rd.meter_id AS "meterId", rd.billing_period_id AS "billingPeriodId", bp.period_code AS "billingPeriodCode", COALESCE(bp.period_name, bp.period_code) AS "billingPeriod", rd.reading_date::text AS "readingDate", rd.previous_reading::text AS "previousReading", rd.present_reading::text AS "presentReading", rd.consumption::text AS consumption, rd.reading_status_id AS "readingStatusId", rs.status_name AS "readingStatus", rd.meter_reader_id AS "meterReaderId", e.employee_name AS "meterReader", rd.remarks, sa.control_no AS "controlNo", c.customer_name AS "customerName", rr.route_code AS "routeCode", rr.route_name AS "routeName", m.meter_no AS "meterNo", ms.meter_size AS "meterSize", rd.created_at::text AS "createdAt", rd.updated_at::text AS "updatedAt" FROM meter_readings rd INNER JOIN service_accounts sa ON sa.service_account_id=rd.service_account_id INNER JOIN customers c ON c.customer_id=sa.customer_id INNER JOIN meters m ON m.meter_id=rd.meter_id INNER JOIN mt_billing_period bp ON bp.billing_period_id=rd.billing_period_id LEFT JOIN mt_reading_route rr ON rr.route_id=sa.route_id LEFT JOIN mt_meter_size ms ON ms.meter_size_id=m.meter_size_id LEFT JOIN mt_reading_status rs ON rs.reading_status_id=rd.reading_status_id LEFT JOIN mt_meter_reader mr ON mr.meter_reader_id=rd.meter_reader_id LEFT JOIN mt_employee e ON e.employee_id=mr.employee_id`;

function parse(body: Record<string, unknown>) {
  const value = { serviceAccountId: text(body.serviceAccountId, 30), meterId: text(body.meterId, 30), readingDate: text(body.readingDate, 10), presentReading: text(body.presentReading, 30), readingStatusId: text(body.readingStatusId, 30) || null, meterReaderId: text(body.meterReaderId, 30) || null, remarks: text(body.remarks) || null };
  const errors: Record<string, string> = {};
  if (!isId(value.serviceAccountId)) errors.serviceAccountId = "Select a service account.";
  if (!isId(value.meterId)) errors.meterId = "Select a meter.";
  if (!isDate(value.readingDate)) errors.readingDate = "Enter a valid reading date.";
  if (!/^\d+(\.\d+)?$/.test(value.presentReading)) errors.presentReading = "Enter a non-negative present reading.";
  if (value.readingStatusId && !isId(value.readingStatusId)) errors.readingStatusId = "Select a valid reading status.";
  if (value.meterReaderId && !isId(value.meterReaderId)) errors.meterReaderId = "Select a valid meter reader.";
  return { value, errors };
}

export async function GET(_: Request, { params }: Context) {
  const auth = await requirePermission("METER_READING_VIEW");
  if (auth.response) return auth.response;
  const readingId = (await params).readingId;
  if (!isId(readingId)) return fail("Meter reading not found.", 404);
  try {
    const result = await db.query(`${detailSql} WHERE rd.reading_id=$1`, [readingId]);
    if (!result.rows[0]) return fail("Meter reading not found.", 404);
    return Response.json({ success: true, data: result.rows[0] });
  } catch (error) { console.error("Unable to load meter reading:", error); return fail("Unable to load meter reading.", 500); }
}

export async function PATCH(request: Request, { params }: Context) {
  const auth = await requirePermission("METER_READING_EDIT");
  if (auth.response) return auth.response;
  const readingId = (await params).readingId;
  if (!isId(readingId)) return fail("Meter reading not found.", 404);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return fail("Invalid request.", 400); }
  const { value, errors } = parse(body);
  if (Object.keys(errors).length) return Response.json({ success: false, message: "Invalid meter reading data.", errors }, { status: 400 });
  try {
    const existing = await db.query<{ billing_period_id: string; status: string }>("SELECT rd.billing_period_id::text, bp.status FROM meter_readings rd INNER JOIN mt_billing_period bp ON bp.billing_period_id=rd.billing_period_id WHERE rd.reading_id=$1", [readingId]);
    if (!existing.rows[0]) return fail("Meter reading not found.", 404);
    if (existing.rows[0].status.toUpperCase() !== "OPEN") return fail("Readings in a closed billing period cannot be modified through this workflow.", 409);
    const [meter, status, reader] = await Promise.all([
      db.query("SELECT meter_id FROM meters WHERE meter_id=$1 AND service_account_id=$2 AND UPPER(status)='ACTIVE'", [value.meterId, value.serviceAccountId]),
      value.readingStatusId ? db.query("SELECT reading_status_id FROM mt_reading_status WHERE reading_status_id=$1 AND is_active=TRUE", [value.readingStatusId]) : Promise.resolve({ rows: [{}] }),
      value.meterReaderId ? db.query("SELECT mr.meter_reader_id FROM mt_meter_reader mr INNER JOIN mt_employee e ON e.employee_id=mr.employee_id WHERE mr.meter_reader_id=$1 AND mr.is_active=TRUE AND e.is_active=TRUE", [value.meterReaderId]) : Promise.resolve({ rows: [{}] }),
    ]);
    if (!meter.rows[0]) return fail("The selected active meter does not belong to the service account.", 400);
    if (!status.rows[0]) return fail("The selected reading status is unavailable.", 400);
    if (!reader.rows[0]) return fail("The selected meter reader is unavailable.", 400);
    const history = await db.query<{ previous: string }>("SELECT COALESCE((SELECT present_reading::text FROM meter_readings WHERE meter_id=$1 AND service_account_id=$2 AND reading_id<>$3 ORDER BY reading_date DESC, reading_id DESC LIMIT 1),(SELECT initial_reading::text FROM meters WHERE meter_id=$1)) AS previous", [value.meterId, value.serviceAccountId, readingId]);
    const previous = Number(history.rows[0]?.previous), present = Number(value.presentReading);
    if (!Number.isFinite(previous) || previous < 0 || !Number.isFinite(present) || present < previous) return fail("Present reading cannot be lower than the previous reading.", 400);
    const result = await db.query(`UPDATE meter_readings SET service_account_id=$1, meter_id=$2, reading_date=$3::date, previous_reading=$4, present_reading=$5, consumption=$6, reading_status_id=$7, meter_reader_id=$8, remarks=$9, updated_by=$10, updated_at=NOW() WHERE reading_id=$11 RETURNING reading_id AS "readingId"`, [value.serviceAccountId, value.meterId, value.readingDate, previous, present, present - previous, value.readingStatusId, value.meterReaderId, value.remarks, auth.user.userId, readingId]);
    return Response.json({ success: true, data: result.rows[0], message: "Meter reading updated successfully." });
  } catch (error) { console.error("Unable to update meter reading:", error); return fail("Unable to update meter reading.", 500); }
}
