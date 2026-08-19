import { db } from "@/lib/db";
import { requireAnyPermission, requirePermission } from "@/lib/permissions";
import { clean, isIsoDate } from "@/modules/service-applications/server";

export const runtime = "nodejs";
type Context = { params: Promise<{ controlNo: string }> };

export async function GET(_request: Request, context: Context) {
  const auth = await requireAnyPermission(["SERVICE_ACCOUNT_VIEW", "SERVICE_ACCOUNT_EDIT"]);
  if (auth.response) return auth.response;
  const controlNo = decodeURIComponent((await context.params).controlNo);
  try {
    const result = await db.query(
      `SELECT acc.control_no AS "controlNo", c.customer_name AS "customerName", c.customer_no AS "customerNo", cc.classification_name AS classification, cc.classification_code AS "classificationCode", COALESCE(ct.connection_type_name, 'Not set') AS "connectionType", COALESCE(ct.connection_type_code, '') AS "connectionTypeCode", COALESCE(cs.status_name, 'Not set') AS status, COALESCE(cs.status_code, '') AS "statusCode", st.service_type_name AS "serviceType", st.service_type_code AS "serviceTypeCode", rr.route_name AS "readingRoute", rr.route_code AS "routeCode", acc.date_connected::text AS "dateConnected", acc.address AS "serviceAddress", acc.created_at::text AS "createdAt", acc.updated_at::text AS "updatedAt", json_build_object('customerNo', c.customer_no, 'name', c.customer_name, 'address', c.address, 'barangay', b.barangay_name, 'contactNo', c.contact_no, 'status', c.status) AS customer, CASE WHEN sa.application_id IS NULL THEN NULL ELSE json_build_object('applicationNo', sa.application_no, 'applicationType', at.application_type_name, 'applicationDate', sa.application_date::text, 'status', ast.status_name, 'statusCode', ast.status_code) END AS application FROM service_accounts acc JOIN customers c ON c.customer_id = acc.customer_id LEFT JOIN mt_barangay b ON b.barangay_id = c.barangay_id JOIN mt_customer_classification cc ON cc.classification_id = acc.classification_id LEFT JOIN mt_connection_type ct ON ct.connection_type_id = acc.connection_type_id LEFT JOIN mt_connection_status cs ON cs.connection_status_id = acc.connection_status_id LEFT JOIN mt_service_type st ON st.service_type_id = acc.service_type_id LEFT JOIN mt_reading_route rr ON rr.route_id = acc.route_id LEFT JOIN service_applications sa ON sa.application_id = acc.application_id LEFT JOIN mt_application_type at ON at.application_type_id = sa.application_type_id LEFT JOIN mt_application_status ast ON ast.application_status_id = sa.application_status_id WHERE acc.control_no = $1 LIMIT 1`,
      [controlNo],
    );
    if (!result.rows[0])
      return Response.json(
        { success: false, message: "Service account not found." },
        { status: 404 },
      );
    return Response.json({ success: true, data: result.rows[0] });
<<<<<<< HEAD
  } catch (error) { console.error("Unable to load service account:", error); return Response.json({ success: false, message: "Unable to load the service account." }, { status: 500 }); }
=======
  } catch (error) {
    console.error("Unable to load service account:", error);
    return Response.json(
      { success: false, message: "Unable to load the service account." },
      { status: 500 },
    );
  }
>>>>>>> 5e852f8f672f3ffc47731a0574417c82b0b41e8a
}

export async function PUT(request: Request, context: Context) {
  const auth = await requirePermission("SERVICE_ACCOUNT_EDIT");
  if (auth.response) return auth.response;
  const controlNo = decodeURIComponent((await context.params).controlNo);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, message: "Invalid request." },
      { status: 400 },
    );
  }
  const classificationCode = clean(body.classificationCode, 30);
  const connectionTypeCode = clean(body.connectionTypeCode, 30);
  const connectionStatusCode = clean(body.connectionStatusCode, 30);
  const serviceTypeCode = clean(body.serviceTypeCode, 30) || null;
  const routeCode = clean(body.routeCode, 30) || null;
  const dateConnected = clean(body.dateConnected, 10) || null;
  const address = clean(body.address, 4000) || null;
  const errors: Record<string, string> = {};
<<<<<<< HEAD
  if (!classificationCode) errors.classificationCode = "Select a classification.";
  if (!connectionTypeCode) errors.connectionTypeCode = "Select a connection type.";
  if (dateConnected && !isIsoDate(dateConnected)) errors.dateConnected = "Enter a valid connection date.";
  if (Object.keys(errors).length) return Response.json({ success: false, message: "Please complete all required service account information.", errors }, { status: 400 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ service_account_id: string; connection_status_id: string | null }>("SELECT service_account_id, connection_status_id FROM service_accounts WHERE control_no = $1 FOR UPDATE", [controlNo]);
    if (!current.rows[0]) throw new Error("NOT_FOUND");
    const [classification, connectionType, connectionStatus, serviceType, route] = await Promise.all([
      client.query<{ classification_id: string }>("SELECT classification_id FROM mt_customer_classification WHERE classification_code = $1 AND is_active = TRUE LIMIT 1", [classificationCode]),
      client.query<{ connection_type_id: string }>("SELECT connection_type_id FROM mt_connection_type WHERE connection_type_code = $1 AND is_active = TRUE LIMIT 1", [connectionTypeCode]),
      connectionStatusCode ? client.query<{ connection_status_id: string }>("SELECT connection_status_id FROM mt_connection_status WHERE status_code = $1 AND is_active = TRUE LIMIT 1", [connectionStatusCode]) : client.query<{ connection_status_id: string }>("SELECT connection_status_id FROM mt_connection_status WHERE connection_status_id = $1 AND is_active = TRUE LIMIT 1", [current.rows[0].connection_status_id]),
      serviceTypeCode ? client.query<{ service_type_id: string }>("SELECT service_type_id FROM mt_service_type WHERE service_type_code = $1 AND is_active = TRUE LIMIT 1", [serviceTypeCode]) : Promise.resolve({ rows: [] as { service_type_id: string }[] }),
      routeCode ? client.query<{ route_id: string }>("SELECT route_id FROM mt_reading_route WHERE route_code = $1 AND is_active = TRUE LIMIT 1", [routeCode]) : Promise.resolve({ rows: [] as { route_id: string }[] }),
    ]);
    if (!classification.rows[0]) throw new Error("INVALID_CLASSIFICATION");
    if (!connectionType.rows[0]) throw new Error("INVALID_CONNECTION_TYPE");
    if (!connectionStatus.rows[0]) throw new Error("INVALID_CONNECTION_STATUS");
    if (serviceTypeCode && !serviceType.rows[0]) throw new Error("INVALID_SERVICE_TYPE");
    if (routeCode && !route.rows[0]) throw new Error("INVALID_ROUTE");
    await client.query(`UPDATE service_accounts SET classification_id=$1, connection_type_id=$2, connection_status_id=$3, service_type_id=$4, route_id=$5, date_connected=$6::date, address=$7, updated_by=$8, updated_at=NOW() WHERE service_account_id=$9`, [classification.rows[0].classification_id, connectionType.rows[0].connection_type_id, connectionStatus.rows[0].connection_status_id, serviceType.rows[0]?.service_type_id ?? null, route.rows[0]?.route_id ?? null, dateConnected, address, auth.user.userId, current.rows[0].service_account_id]);
=======
  if (!classificationCode)
    errors.classificationCode = "Select a classification.";
  if (!connectionTypeCode)
    errors.connectionTypeCode = "Select a connection type.";
  if (Object.keys(errors).length)
    return Response.json(
      { success: false, message: "Check the required fields.", errors },
      { status: 400 },
    );

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ service_account_id: string }>(
      "SELECT service_account_id FROM service_accounts WHERE control_no = $1 FOR UPDATE",
      [controlNo],
    );
    if (!current.rows[0]) throw new Error("NOT_FOUND");
    const classification = await client.query<{ classification_id: string }>(
      "SELECT classification_id FROM mt_customer_classification WHERE classification_code = $1 AND is_active = TRUE LIMIT 1",
      [classificationCode],
    );
    if (!classification.rows[0]) throw new Error("INVALID_CLASSIFICATION");
    const connectionType = await client.query<{ connection_type_id: string }>(
      "SELECT connection_type_id FROM mt_connection_type WHERE connection_type_code = $1 AND is_active = TRUE LIMIT 1",
      [connectionTypeCode],
    );
    if (!connectionType.rows[0]) throw new Error("INVALID_CONNECTION_TYPE");
    await client.query(
      `UPDATE service_accounts SET classification_id = $1, connection_type_id = $2, updated_by = $3, updated_at = NOW() WHERE service_account_id = $4`,
      [
        classification.rows[0].classification_id,
        connectionType.rows[0].connection_type_id,
        auth.user.userId,
        current.rows[0].service_account_id,
      ],
    );
>>>>>>> 5e852f8f672f3ffc47731a0574417c82b0b41e8a
    await client.query("COMMIT");
    return Response.json({
      success: true,
      message: `Service account ${controlNo} was updated successfully.`,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    const code = error instanceof Error ? error.message : "";
<<<<<<< HEAD
    const failures: Record<string, [string, number]> = { NOT_FOUND: ["Service account not found.", 404], INVALID_CLASSIFICATION: ["The selected classification is unavailable.", 400], INVALID_CONNECTION_TYPE: ["The selected connection type is unavailable.", 400], INVALID_CONNECTION_STATUS: ["The selected connection status is unavailable.", 400], INVALID_SERVICE_TYPE: ["The selected service type is unavailable.", 400], INVALID_ROUTE: ["The selected reading route is unavailable.", 400] };
    if (failures[code]) return Response.json({ success: false, message: failures[code][0] }, { status: failures[code][1] });
=======
    if (code === "NOT_FOUND")
      return Response.json(
        { success: false, message: "Service account not found." },
        { status: 404 },
      );
    if (code === "INVALID_CLASSIFICATION")
      return Response.json(
        {
          success: false,
          message: "The selected classification is unavailable.",
        },
        { status: 400 },
      );
    if (code === "INVALID_CONNECTION_TYPE")
      return Response.json(
        {
          success: false,
          message: "The selected connection type is unavailable.",
        },
        { status: 400 },
      );
>>>>>>> 5e852f8f672f3ffc47731a0574417c82b0b41e8a
    console.error("Unable to update service account:", error);
    return Response.json(
      { success: false, message: "Unable to update the service account." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
