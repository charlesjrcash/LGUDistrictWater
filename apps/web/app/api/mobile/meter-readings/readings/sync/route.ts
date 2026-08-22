import { db } from "@/lib/db";
import { date, decimal, fail, id, localTimestamp, mobileDatabaseError, requiredString, stringValue, text, value } from "@/lib/mobile-meter-readings";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";

type SyncRequest = {
  batchId: string;
  readingId: string;
  meterReaderId: string;
  presentReading: string;
  readingStatusId: string;
  readingDate: string;
  remarks: string | null;
  latitude: string | null;
  longitude: string | null;
  gpsAccuracy: string | null;
  readingCapturedAt: string;
  deviceId: string;
};

function parse(body: Record<string, unknown>): SyncRequest | { message: string } {
  for (const field of ["consumption", "previousReading", "workflowStatus", "validatedBy", "updatedBy"]) {
    if (field in body) return { message: `${field} is server-authoritative and cannot be submitted.` };
  }
  const parsed = {
    batchId: id(body.batchId),
    readingId: id(body.readingId),
    meterReaderId: id(body.meterReaderId),
    presentReading: decimal(body.presentReading),
    readingStatusId: id(body.readingStatusId),
    readingDate: date(body.readingDate),
    remarks: text(body.remarks, 4_000) || null,
    latitude: body.latitude === null || body.latitude === undefined || body.latitude === "" ? null : decimal(body.latitude, { allowNegative: true }),
    longitude: body.longitude === null || body.longitude === undefined || body.longitude === "" ? null : decimal(body.longitude, { allowNegative: true }),
    gpsAccuracy: body.gpsAccuracy === null || body.gpsAccuracy === undefined || body.gpsAccuracy === "" ? null : decimal(body.gpsAccuracy),
    readingCapturedAt: localTimestamp(body.readingCapturedAt),
    deviceId: text(body.deviceId, 200),
  };
  if (!parsed.batchId || !parsed.readingId || !parsed.meterReaderId || !parsed.presentReading || !parsed.readingStatusId || !parsed.readingDate || !parsed.readingCapturedAt || !parsed.deviceId) {
    return { message: "batchId, readingId, meterReaderId, presentReading, readingStatusId, readingDate, readingCapturedAt, and deviceId are required and must be valid." };
  }
  if (parsed.latitude === null && body.latitude !== null && body.latitude !== undefined && body.latitude !== "") return { message: "latitude must be a valid decimal value." };
  if (parsed.longitude === null && body.longitude !== null && body.longitude !== undefined && body.longitude !== "") return { message: "longitude must be a valid decimal value." };
  if (parsed.gpsAccuracy === null && body.gpsAccuracy !== null && body.gpsAccuracy !== undefined && body.gpsAccuracy !== "") return { message: "gpsAccuracy must be a non-negative decimal value." };
  return {
    batchId: parsed.batchId,
    readingId: parsed.readingId,
    meterReaderId: parsed.meterReaderId,
    presentReading: parsed.presentReading,
    readingStatusId: parsed.readingStatusId,
    readingDate: parsed.readingDate,
    remarks: parsed.remarks,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    gpsAccuracy: parsed.gpsAccuracy,
    readingCapturedAt: parsed.readingCapturedAt,
    deviceId: parsed.deviceId,
  };
}

function isError(value: SyncRequest | { message: string }): value is { message: string } {
  return "message" in value;
}

export async function POST(request: Request) {
  const auth = await requirePermission("METER_READING_EDIT");
  if (auth.response) return auth.response;

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return fail("Invalid request body.", 400); }
  const payload = parse(body);
  if (isError(payload)) return fail(payload.message, 400);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const synced = await client.query(
      "SELECT * FROM public.fn_sync_mobile_meter_reading($1::bigint, $2::bigint, $3::bigint, $4::numeric, $5::bigint, $6::date, $7::text, $8::numeric, $9::numeric, $10::numeric, $11::timestamp without time zone, $12::varchar, $13::bigint)",
      [payload.batchId, payload.readingId, payload.meterReaderId, payload.presentReading, payload.readingStatusId, payload.readingDate, payload.remarks, payload.latitude, payload.longitude, payload.gpsAccuracy, payload.readingCapturedAt, payload.deviceId, auth.user.userId],
    );
    const syncResult = synced.rows[0];
    if (!syncResult) throw new Error("Mobile reading sync returned no result.");

    // Scope is re-read from the persisted assignment, never copied from the client payload.
    const scope = await client.query<{ billing_period_id: string; route_id: string; meter_reader_id: string }>(
      `SELECT rd.billing_period_id::text, sa.route_id::text, rd.meter_reader_id::text
         FROM meter_readings rd
         INNER JOIN service_accounts sa ON sa.service_account_id = rd.service_account_id
        WHERE rd.reading_id = $1
        FOR UPDATE`,
      [payload.readingId],
    );
    const persistedScope = scope.rows[0];
    if (!persistedScope?.route_id || !persistedScope.meter_reader_id) {
      throw new Error("The synchronized reading has no validation scope.");
    }
    const validationResult = await client.query(
      "SELECT * FROM public.fn_validate_meter_readings($1::bigint, $2::bigint, $3::bigint, $4::bigint)",
      [persistedScope.billing_period_id, persistedScope.route_id, persistedScope.meter_reader_id, auth.user.userId],
    );
    const validation = validationResult.rows[0] ?? {};
    const finalReadingResult = await client.query(
      `SELECT rd.reading_id, rd.previous_reading, rd.present_reading, rd.consumption,
              rd.reading_status_id, workflow.status_code AS workflow_status_code
         FROM meter_readings rd
         INNER JOIN mt_reading_workflow_status workflow
           ON workflow.reading_workflow_status_id = rd.reading_workflow_status_id
        WHERE rd.reading_id = $1`,
      [payload.readingId],
    );
    const finalReading = finalReadingResult.rows[0];
    if (!finalReading) throw new Error("The synchronized meter reading was not found.");
    await client.query("COMMIT");

    return Response.json({
      success: true,
      data: {
        readingId: requiredString(finalReading, "reading_id"),
        previousReading: stringValue(value(finalReading, "previous_reading")),
        presentReading: stringValue(value(finalReading, "present_reading")),
        consumption: stringValue(value(finalReading, "consumption")),
        readingStatusId: stringValue(value(finalReading, "reading_status_id")),
        workflowStatusCode: requiredString(finalReading, "workflow_status_code"),
        syncResult: requiredString(syncResult, "sync_result"),
        validation: {
          completedCount: Number(value(validation, "completed_count") ?? 0),
          validatedCount: Number(value(validation, "validated_count") ?? 0),
          exceptionCount: Number(value(validation, "exception_count") ?? 0),
        },
      },
    });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* Transaction may already be closed by the database function. */ }
    console.error("Unable to synchronize mobile meter reading:", error);
    return fail(mobileDatabaseError(error, "Unable to synchronize the mobile meter reading."), 500);
  } finally {
    client.release();
  }
}
