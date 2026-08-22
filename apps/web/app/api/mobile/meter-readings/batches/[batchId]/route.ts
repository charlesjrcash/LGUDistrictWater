import { db } from "@/lib/db";
import { fail, id, localDateValue, localTimestampValue, mobileDatabaseError, requiredString, statusDto, stringValue, value } from "@/lib/mobile-meter-readings";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";
type Context = { params: Promise<{ batchId: string }> };

function batchDto(row: Record<string, unknown>) {
  return {
    batchId: requiredString(row, "batch_id"),
    status: requiredString(row, "batch_status"),
    billingPeriodId: requiredString(row, "billing_period_id"),
    billingPeriodCode: requiredString(row, "billing_period_code"),
    billingPeriodName: requiredString(row, "billing_period_name"),
    billingStartDate: localDateValue(value(row, "billing_start_date")),
    billingEndDate: localDateValue(value(row, "billing_end_date")),
    routeId: requiredString(row, "route_id"),
    routeCode: requiredString(row, "route_code"),
    routeName: requiredString(row, "route_name"),
    routeSequenceNo: value(row, "route_sequence_no") === null ? null : Number(value(row, "route_sequence_no")),
    meterReaderId: requiredString(row, "meter_reader_id"),
    meterReaderCode: requiredString(row, "meter_reader_code"),
    meterReaderName: requiredString(row, "meter_reader_name"),
    totalReadings: Number(value(row, "total_readings") ?? 0),
    preparedAt: localTimestampValue(value(row, "prepared_at")),
    downloadedAt: localTimestampValue(value(row, "downloaded_at")),
    acknowledgedAt: localTimestampValue(value(row, "acknowledged_at")),
    deviceId: stringValue(value(row, "device_id")),
  };
}

function readingDto(row: Record<string, unknown>) {
  const statusId = stringValue(value(row, "reading_status_id"));
  const workflow = requiredString(row, "workflow_status_code");
  const unreadAssignment = !statusId && ["FOR_READ", "IN_PROGRESS"].includes(workflow);
  return {
    readingId: requiredString(row, "reading_id"),
    serviceAccountId: requiredString(row, "service_account_id"),
    controlNo: requiredString(row, "control_no"),
    customerName: requiredString(row, "customer_name"),
    serviceAddress: stringValue(value(row, "service_address")),
    meterId: requiredString(row, "meter_id"),
    meterNo: requiredString(row, "meter_no"),
    scheduledReadingDate: localDateValue(value(row, "scheduled_reading_date")),
    previousReading: stringValue(value(row, "previous_reading")),
    presentReading: unreadAssignment ? null : stringValue(value(row, "present_reading")),
    consumption: unreadAssignment ? null : stringValue(value(row, "consumption")),
    readingStatusId: statusId,
    serverWorkflowStatusId: requiredString(row, "reading_workflow_status_id"),
    serverWorkflowStatusCode: workflow,
    remarks: stringValue(value(row, "remarks")),
  };
}

export async function GET(_: Request, { params }: Context) {
  const auth = await requirePermission("METER_READING_VIEW");
  if (auth.response) return auth.response;
  const batchId = id((await params).batchId);
  if (!batchId) return fail("Mobile batch not found.", 404);

  try {
    const [batchResult, statusesResult] = await Promise.all([
      db.query("SELECT * FROM public.fn_get_mobile_reading_batch($1::bigint)", [batchId]),
      db.query("SELECT * FROM public.fn_get_mobile_reading_statuses()"),
    ]);
    const firstRow = batchResult.rows[0];
    if (!firstRow) return fail("Mobile batch not found.", 404);
    return Response.json({
      success: true,
      data: {
        batch: batchDto(firstRow),
        readingStatuses: statusesResult.rows.map(statusDto),
        readings: batchResult.rows.map(readingDto),
      },
    });
  } catch (error) {
    console.error("Unable to download mobile reading batch:", error);
    return fail(mobileDatabaseError(error, "Unable to download the mobile reading batch."), 500);
  }
}
