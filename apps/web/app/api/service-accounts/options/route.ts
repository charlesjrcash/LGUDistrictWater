import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [classifications, connectionTypes, statuses] = await Promise.all([
      db.query(`SELECT classification_code AS code, classification_name AS name FROM mt_customer_classification WHERE is_active = TRUE ORDER BY classification_name`),
      db.query(`SELECT connection_type_code AS code, connection_type_name AS name FROM mt_connection_type WHERE is_active = TRUE ORDER BY connection_type_name`),
      db.query(`SELECT status_code AS code, status_name AS name, description FROM mt_connection_status WHERE is_active = TRUE ORDER BY connection_status_id`),
    ]);
    return Response.json({ success: true, data: { classifications: classifications.rows, connectionTypes: connectionTypes.rows, statuses: statuses.rows } });
  } catch (error) {
    console.error("Unable to load service account options:", error);
    return Response.json({ success: false, message: "Unable to load service account options." }, { status: 500 });
  }
}
