import { db } from "@/lib/db";
import { fail, mobileDatabaseError, statusDto } from "@/lib/mobile-meter-readings";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requirePermission("METER_READING_VIEW");
  if (auth.response) return auth.response;

  try {
    const result = await db.query("SELECT * FROM public.fn_get_mobile_reading_statuses()");
    return Response.json({ success: true, data: result.rows.map(statusDto) });
  } catch (error) {
    console.error("Unable to load mobile reading statuses:", error);
    return fail(mobileDatabaseError(error, "Unable to load mobile reading statuses."), 500);
  }
}
