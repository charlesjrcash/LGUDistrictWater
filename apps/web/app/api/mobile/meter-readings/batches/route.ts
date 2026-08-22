import { db } from "@/lib/db";
import { fail, id, mobileDatabaseError, requiredString, text, value } from "@/lib/mobile-meter-readings";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";

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
    return fail(mobileDatabaseError(error, "Unable to prepare the mobile reading batch."), 500);
  }
}
