import { db } from "@/lib/db";
import { fail, id, mobileDatabaseError, requiredString, text, value } from "@/lib/mobile-meter-readings";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";
type Context = { params: Promise<{ batchId: string }> };

export async function POST(request: Request, { params }: Context) {
  const auth = await requirePermission("METER_READING_EDIT");
  if (auth.response) return auth.response;
  const batchId = id((await params).batchId);
  if (!batchId) return fail("Mobile batch not found.", 404);

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return fail("Invalid request body.", 400); }
  const meterReaderId = id(body.meterReaderId);
  const deviceId = text(body.deviceId, 200);
  if (!meterReaderId || !deviceId) return fail("meterReaderId and deviceId are required.", 400);

  try {
    const result = await db.query(
      "SELECT * FROM public.fn_acknowledge_mobile_reading_batch($1::bigint, $2::bigint, $3::varchar, $4::bigint)",
      [batchId, meterReaderId, deviceId, auth.user.userId],
    );
    const acknowledged = result.rows[0];
    if (!acknowledged) return fail("Mobile batch not found.", 404);
    return Response.json({
      success: true,
      data: {
        batchId: requiredString(acknowledged, "batch_id"),
        totalReadings: Number(value(acknowledged, "total_readings") ?? 0),
        updatedReadings: Number(value(acknowledged, "updated_readings") ?? 0),
        batchStatus: requiredString(acknowledged, "batch_status"),
      },
    });
  } catch (error) {
    console.error("Unable to acknowledge mobile reading batch:", error);
    return fail(mobileDatabaseError(error, "Unable to acknowledge the mobile reading batch."), 500);
  }
}
