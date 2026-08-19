import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/server-session";
import { clean } from "@/modules/service-applications/server";

export const runtime = "nodejs";
type Context = { params: Promise<{ controlNo: string }> };

export async function GET(_request: Request, context: Context) {
  const auth = await requireSessionUser();
  if (auth.response) return auth.response;
  const controlNo = decodeURIComponent((await context.params).controlNo);
  try {
    const result = await db.query(
      `SELECT acc.control_no AS "controlNo", c.customer_name AS "customerName", c.customer_no AS "customerNo",
              cc.classification_name AS classification, cc.classification_code AS "classificationCode",
              COALESCE(ct.connection_type_name, 'Not set') AS "connectionType", COALESCE(ct.connection_type_code, '') AS "connectionTypeCode",
              acc.date_connected::text AS "dateConnected", COALESCE(cs.status_name, 'Not set') AS status,
              COALESCE(cs.status_code, '') AS "statusCode", acc.created_at::text AS "createdAt", acc.updated_at::text AS "updatedAt",
              json_build_object('customerNo', c.customer_no, 'name', c.customer_name, 'address', c.address,
                                'barangay', b.barangay_name, 'contactNo', c.contact_no, 'status', c.status) AS customer,
              CASE WHEN sa.application_id IS NULL THEN NULL ELSE json_build_object(
                'applicationNo', sa.application_no, 'applicationType', at.application_type_name,
                'applicationDate', sa.application_date::text, 'status', ast.status_name, 'statusCode', ast.status_code
              ) END AS application
         FROM service_accounts acc
         JOIN customers c ON c.customer_id = acc.customer_id
         LEFT JOIN mt_barangay b ON b.barangay_id = c.barangay_id
         JOIN mt_customer_classification cc ON cc.classification_id = acc.classification_id
         LEFT JOIN mt_connection_type ct ON ct.connection_type_id = acc.connection_type_id
         LEFT JOIN mt_connection_status cs ON cs.connection_status_id = acc.connection_status_id
         LEFT JOIN service_applications sa ON sa.application_id = acc.application_id
         LEFT JOIN mt_application_type at ON at.application_type_id = sa.application_type_id
         LEFT JOIN mt_application_status ast ON ast.application_status_id = sa.application_status_id
        WHERE acc.control_no = $1 LIMIT 1`,
      [controlNo],
    );
    if (!result.rows[0])
      return Response.json(
        { success: false, message: "Service account not found." },
        { status: 404 },
      );
    return Response.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Unable to load service account:", error);
    return Response.json(
      { success: false, message: "Unable to load the service account." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: Context) {
  const auth = await requireSessionUser();
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
  const errors: Record<string, string> = {};
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
    await client.query("COMMIT");
    return Response.json({
      success: true,
      message: `Service account ${controlNo} was updated successfully.`,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    const code = error instanceof Error ? error.message : "";
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
    console.error("Unable to update service account:", error);
    return Response.json(
      { success: false, message: "Unable to update the service account." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
