import { db } from "@/lib/db";
import { fail, id, mobileDatabaseError, requiredString, text, value } from "@/lib/mobile-meter-readings";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";

function databaseMessage(error: unknown) {
  return error instanceof Error ? error.message.toLowerCase() : "";
}

async function activeBatch(billingPeriodId: string, meterReaderId: string, routeId: string) {
  const result = await db.query(
    `SELECT b.batch_id::text AS "batchId", b.batch_status AS "batchStatus", b.route_id::text AS "routeId", r.route_code AS "routeCode", r.route_name AS "routeName"
       FROM mobile_reading_batches b
       INNER JOIN mt_reading_route r ON r.route_id = b.route_id
      WHERE b.billing_period_id = $1::bigint
        AND b.meter_reader_id = $2::bigint
        AND b.route_id = $3::bigint
        AND UPPER(b.batch_status) IN ('PREPARED', 'DOWNLOADED', 'ACKNOWLEDGED')
      ORDER BY b.prepared_at DESC, b.batch_id DESC
      LIMIT 1`,
    [billingPeriodId, meterReaderId, routeId],
  );
  return result.rows[0] ?? null;
}

export async function GET(request: Request) {
  const auth = await requirePermission("METER_READING_VIEW");
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const filters = [
    ["billingPeriodId", "b.billing_period_id"],
    ["meterReaderId", "b.meter_reader_id"],
    ["routeId", "b.route_id"],
  ] as const;
  const values: string[] = [];
  const where: string[] = [];
  for (const [parameter, column] of filters) {
    const filter = id(params.get(parameter));
    if (filter) { values.push(filter); where.push(`${column} = $${values.length}::bigint`); }
  }
  const batchStatus = text(params.get("batchStatus"), 30).toUpperCase();
  if (batchStatus) { values.push(batchStatus); where.push(`UPPER(b.batch_status) = $${values.length}`); }
  try {
    const result = await db.query(
      `SELECT b.batch_id::text AS "batchId", b.batch_status AS "batchStatus", b.billing_period_id::text AS "billingPeriodId", bp.period_code AS "billingPeriodCode", COALESCE(bp.period_name, bp.period_code) AS "billingPeriodName", b.route_id::text AS "routeId", r.route_code AS "routeCode", r.route_name AS "routeName", b.meter_reader_id::text AS "meterReaderId", e.employee_name AS "meterReaderName", b.total_readings AS "totalReadings", b.prepared_at::text AS "preparedAt", b.downloaded_at::text AS "downloadedAt", b.acknowledged_at::text AS "acknowledgedAt", b.device_id AS "deviceId", COUNT(item.reading_id) FILTER (WHERE workflow.status_code = 'FOR_READ')::int AS "forRead", COUNT(item.reading_id) FILTER (WHERE workflow.status_code = 'IN_PROGRESS')::int AS "inProgress", COUNT(item.reading_id) FILTER (WHERE workflow.status_code = 'COMPLETED')::int AS completed, COUNT(item.reading_id) FILTER (WHERE workflow.status_code = 'VALIDATED')::int AS validated FROM mobile_reading_batches b INNER JOIN mt_billing_period bp ON bp.billing_period_id = b.billing_period_id INNER JOIN mt_reading_route r ON r.route_id = b.route_id INNER JOIN mt_meter_reader mr ON mr.meter_reader_id = b.meter_reader_id INNER JOIN mt_employee e ON e.employee_id = mr.employee_id LEFT JOIN mobile_reading_batch_items item ON item.batch_id = b.batch_id LEFT JOIN meter_readings rd ON rd.reading_id = item.reading_id LEFT JOIN mt_reading_workflow_status workflow ON workflow.reading_workflow_status_id = rd.reading_workflow_status_id ${where.length ? `WHERE ${where.join(" AND ")}` : ""} GROUP BY b.batch_id, bp.period_code, bp.period_name, r.route_code, r.route_name, e.employee_name ORDER BY b.prepared_at DESC, b.batch_id DESC`,
      values,
    );
    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Unable to load mobile reading batches:", error);
    return fail(mobileDatabaseError(error, "Unable to load mobile reading batches."), 500);
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission("METER_READING_CREATE");
  if (auth.response) return auth.response;

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return fail("Invalid request body.", 400); }
  const billingPeriodId = id(body.billingPeriodId);
  const meterReaderId = id(body.meterReaderId);
  const routeId = id(body.routeId);
  const remarks = text(body.remarks, 4_000) || null;
  if (!billingPeriodId || !meterReaderId || !routeId) {
    return fail("billingPeriodId, meterReaderId, and routeId must be valid numeric IDs.", 400);
  }

  try {
    const result = await db.query(
      "SELECT * FROM public.fn_prepare_mobile_reading_batch($1::bigint, $2::bigint, $3::bigint, $4::bigint, $5::text)",
      [billingPeriodId, meterReaderId, routeId, auth.user.userId, remarks],
    );
    const batch = result.rows[0];
    if (!batch) return fail("No eligible FOR_READ meter readings were found for the selected scope.", 409);
    return Response.json({
      success: true,
      data: {
        batchId: requiredString(batch, "batch_id"),
        totalReadings: Number(value(batch, "total_readings") ?? 0),
        batchStatus: requiredString(batch, "batch_status"),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Unable to prepare mobile reading batch:", error);
    const message = databaseMessage(error);
    if (message.includes("active mobile reading batch") || message.includes("already included in an active mobile")) {
      try {
        const existing = await activeBatch(billingPeriodId, meterReaderId, routeId);
        return Response.json({
          success: false,
          code: "ACTIVE_BATCH_EXISTS",
          message: existing
            ? `Batch #${existing.batchId} already exists for ${existing.routeCode} — ${existing.routeName}. Use View Existing Batch or Resync / Re-download instead of preparing another batch.`
            : "A transfer batch already exists for this billing period, meter reader, and route. Use View or Resync / Re-download instead of preparing another batch.",
          data: existing,
        }, { status: 409 });
      } catch (lookupError) {
        console.error("Unable to resolve existing mobile reading batch:", lookupError);
        return Response.json({ success: false, code: "ACTIVE_BATCH_EXISTS", message: "A transfer batch already exists for this billing period, meter reader, and route. Use View or Resync / Re-download instead of preparing another batch." }, { status: 409 });
      }
    }
    if (message.includes("no for_read meter readings")) {
      return Response.json({ success: false, code: "NO_ELIGIBLE_READINGS", message: "No FOR_READ meter readings are available for this route." }, { status: 409 });
    }
    if (message.includes("meter reader")) {
      return Response.json({ success: false, code: "WRONG_READER", message: "This route is not assigned to the selected meter reader." }, { status: 409 });
    }
    return fail(mobileDatabaseError(error, "Unable to prepare the mobile reading batch."), 500);
  }
}
