import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/server-session";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireSessionUser();
  if (auth.response) return auth.response;
  try {
    const [types, statuses] = await Promise.all([
      db.query<{ code: string; name: string }>(
        `SELECT application_type_code AS code, application_type_name AS name
           FROM mt_application_type WHERE is_active = TRUE ORDER BY application_type_name`,
      ),
      db.query<{ code: string; name: string; description: string | null }>(
        `SELECT status_code AS code, status_name AS name, description
           FROM mt_application_status WHERE is_active = TRUE ORDER BY application_status_id`,
      ),
    ]);
    return Response.json({ success: true, data: { types: types.rows, statuses: statuses.rows } });
  } catch (error) {
    console.error("Unable to load service application options:", error);
    return Response.json({ success: false, message: "Unable to load application options." }, { status: 500 });
  }
}
