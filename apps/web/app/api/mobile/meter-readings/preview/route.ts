import { db } from "@/lib/db";
import { fail, id, localDateValue, mobileDatabaseError, requiredString, stringValue, value } from "@/lib/mobile-meter-readings";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";

function previewDto(row: Record<string, unknown>) {
  return {
    readingId: requiredString(row, "reading_id"),
    serviceAccountId: requiredString(row, "service_account_id"),
    controlNo: requiredString(row, "control_no"),
    customerName: requiredString(row, "customer_name"),
    serviceAddress: stringValue(value(row, "service_address")),
    meterId: requiredString(row, "meter_id"),
    meterNo: requiredString(row, "meter_no"),
    scheduledReadingDate: localDateValue(value(row, "reading_date")),
    previousReading: stringValue(value(row, "previous_reading")),
    presentReading: stringValue(value(row, "present_reading")),
    consumption: stringValue(value(row, "consumption")),
    readingStatusId: stringValue(value(row, "reading_status_id")),
    serverWorkflowStatusId: requiredString(row, "reading_workflow_status_id"),
    serverWorkflowStatusCode: requiredString(row, "workflow_status_code"),
  };
}

export async function GET(request: Request) {
  const auth = await requirePermission("METER_READING_VIEW");
  if (auth.response) return auth.response;

  const params = new URL(request.url).searchParams;
  const billingPeriodId = id(params.get("billingPeriodId"));
  const meterReaderId = id(params.get("meterReaderId"));
  const routeId = id(params.get("routeId"));
  if (!billingPeriodId || !meterReaderId || !routeId) {
    return fail("billingPeriodId, meterReaderId, and routeId must be valid numeric IDs.", 400);
  }

  try {
    const result = await db.query(
      "SELECT * FROM public.fn_preview_mobile_reading_transfer($1::bigint, $2::bigint, $3::bigint)",
      [billingPeriodId, meterReaderId, routeId],
    );
    return Response.json({
      success: true,
      data: {
        scope: { billingPeriodId, meterReaderId, routeId },
        totalEligibleReadings: result.rows.length,
        readings: result.rows.map(previewDto),
      },
    });
  } catch (error) {
    console.error("Unable to preview mobile reading transfer:", error);
    return fail(mobileDatabaseError(error, "Unable to preview the mobile reading transfer."), 500);
  }
}
