import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/server-session";

export const runtime = "nodejs";

/** Read-only options endpoint used by material maintenance. */
export async function GET() {
  const auth = await requireSessionUser();
  if (auth.response) return auth.response;

  try {
    const result = await db.query(`
      SELECT unit_id, unit_name
      FROM public.mt_unit_of_measure
      WHERE is_active = TRUE
      ORDER BY unit_name ASC
    `);
    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Failed to load units of measure:", error);
    return Response.json({ success: false, message: "Unable to load units of measure." }, { status: 500 });
  }
}
