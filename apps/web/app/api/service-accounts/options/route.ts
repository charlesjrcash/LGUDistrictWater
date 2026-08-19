import { db } from "@/lib/db";
import { requireAnyPermission } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAnyPermission(["SERVICE_ACCOUNT_CREATE", "SERVICE_ACCOUNT_EDIT", "SERVICE_ACCOUNT_VIEW"]);
  if (auth.response) return auth.response;
  try {
    const [classifications, connectionTypes, statuses, serviceTypes, readingRoutes] = await Promise.all([
      db.query(`SELECT classification_code AS code, classification_name AS name FROM mt_customer_classification WHERE is_active = TRUE ORDER BY classification_name`),
      db.query(`SELECT connection_type_code AS code, connection_type_name AS name FROM mt_connection_type WHERE is_active = TRUE ORDER BY connection_type_name`),
      db.query(`SELECT status_code AS code, status_name AS name, description FROM mt_connection_status WHERE is_active = TRUE ORDER BY connection_status_id`),
      db.query(`SELECT service_type_code AS code, service_type_name AS name FROM mt_service_type WHERE is_active = TRUE ORDER BY service_type_name`),
      db.query(`SELECT route_code AS code, route_name AS name FROM mt_reading_route WHERE is_active = TRUE ORDER BY sequence_no NULLS LAST, route_code`),
    ]);
    return Response.json({ success: true, data: { classifications: classifications.rows, connectionTypes: connectionTypes.rows, statuses: statuses.rows, serviceTypes: serviceTypes.rows, readingRoutes: readingRoutes.rows } });
  } catch (error) {
    console.error("Unable to load service account options:", error);
    return Response.json({ success: false, message: "Unable to load service account options." }, { status: 500 });
  }
}
