import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/server-session";
import { clean } from "@/modules/service-applications/server";
import { findInitialAccountStatus, nextControlNumber } from "@/modules/service-accounts/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireSessionUser();
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const search = clean(params.get("search"), 100);
  const status = clean(params.get("status"), 30);
  const classification = clean(params.get("classification"), 30);
  const connectionType = clean(params.get("connectionType"), 30);
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(5, Number(params.get("pageSize")) || 10));
  const values: unknown[] = [];
  const where: string[] = [];
  if (search) { values.push(`%${search}%`); where.push(`(acc.control_no ILIKE $${values.length} OR c.customer_name ILIKE $${values.length} OR c.customer_no ILIKE $${values.length})`); }
  if (status) { values.push(status); where.push(`cs.status_code = $${values.length}`); }
  if (classification) { values.push(classification); where.push(`cc.classification_code = $${values.length}`); }
  if (connectionType) { values.push(connectionType); where.push(`ct.connection_type_code = $${values.length}`); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  try {
    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM service_accounts acc
       JOIN customers c ON c.customer_id = acc.customer_id
       JOIN mt_customer_classification cc ON cc.classification_id = acc.classification_id
       LEFT JOIN mt_connection_type ct ON ct.connection_type_id = acc.connection_type_id
       LEFT JOIN mt_connection_status cs ON cs.connection_status_id = acc.connection_status_id ${whereSql}`,
      values,
    );
    const rowValues = [...values, pageSize, (page - 1) * pageSize];
    const rows = await db.query(
      `SELECT acc.control_no AS "controlNo", c.customer_name AS "customerName", c.customer_no AS "customerNo",
              cc.classification_name AS classification, cc.classification_code AS "classificationCode",
              COALESCE(ct.connection_type_name, 'Not set') AS "connectionType", COALESCE(ct.connection_type_code, '') AS "connectionTypeCode",
              acc.date_connected::text AS "dateConnected", COALESCE(cs.status_name, 'Not set') AS status,
              COALESCE(cs.status_code, '') AS "statusCode"
         FROM service_accounts acc
         JOIN customers c ON c.customer_id = acc.customer_id
         JOIN mt_customer_classification cc ON cc.classification_id = acc.classification_id
         LEFT JOIN mt_connection_type ct ON ct.connection_type_id = acc.connection_type_id
         LEFT JOIN mt_connection_status cs ON cs.connection_status_id = acc.connection_status_id
         ${whereSql}
        ORDER BY acc.created_at DESC, acc.service_account_id DESC
        LIMIT $${rowValues.length - 1} OFFSET $${rowValues.length}`,
      rowValues,
    );
    const summaryResult = await db.query<{ total: string; active: string; pending: string; disconnected: string }>(
      `SELECT COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE UPPER(COALESCE(cs.status_code,'')) IN ('ACTIVE','CONNECTED') OR UPPER(COALESCE(cs.status_name,'')) IN ('ACTIVE','CONNECTED'))::text AS active,
              COUNT(*) FILTER (WHERE UPPER(COALESCE(cs.status_code,'') || ' ' || COALESCE(cs.status_name,'')) ~ 'PENDING|INSTALL')::text AS pending,
              COUNT(*) FILTER (WHERE UPPER(COALESCE(cs.status_code,'') || ' ' || COALESCE(cs.status_name,'')) LIKE '%DISCONNECT%')::text AS disconnected
         FROM service_accounts acc LEFT JOIN mt_connection_status cs ON cs.connection_status_id = acc.connection_status_id`,
    );
    const total = Number(countResult.rows[0].count);
    return Response.json({ success: true, data: rows.rows, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }, summary: Object.fromEntries(Object.entries(summaryResult.rows[0]).map(([key, value]) => [key, Number(value)])) });
  } catch (error) {
    console.error("Unable to load service accounts:", error);
    return Response.json({ success: false, message: "Unable to load service accounts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if (auth.response) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ success: false, message: "Invalid request." }, { status: 400 }); }
  const applicationNo = clean(body.applicationNo, 50);
  const classificationCode = clean(body.classificationCode, 30);
  const connectionTypeCode = clean(body.connectionTypeCode, 30);
  const errors: Record<string, string> = {};
  if (!applicationNo) errors.applicationNo = "An approved application is required.";
  if (!classificationCode) errors.classificationCode = "Select a classification.";
  if (!connectionTypeCode) errors.connectionTypeCode = "Select a connection type.";
  if (Object.keys(errors).length) return Response.json({ success: false, message: "Check the required fields.", errors }, { status: 400 });

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const application = await client.query<{ application_id: string; customer_id: string; status_code: string; status_name: string }>(
      `SELECT sa.application_id, sa.customer_id, ast.status_code, ast.status_name
         FROM service_applications sa
         JOIN customers c ON c.customer_id = sa.customer_id
         JOIN mt_application_status ast ON ast.application_status_id = sa.application_status_id
        WHERE sa.application_no = $1 FOR UPDATE OF sa`,
      [applicationNo],
    );
    if (!application.rows[0]) throw new Error("APPLICATION_NOT_FOUND");
    if (!`${application.rows[0].status_code} ${application.rows[0].status_name}`.toUpperCase().includes("APPROV")) throw new Error("NOT_APPROVED");
    const existing = await client.query<{ control_no: string }>("SELECT control_no FROM service_accounts WHERE application_id = $1 LIMIT 1", [application.rows[0].application_id]);
    if (existing.rows[0]) throw Object.assign(new Error("ALREADY_EXISTS"), { controlNo: existing.rows[0].control_no });
    const classification = await client.query<{ classification_id: string }>("SELECT classification_id FROM mt_customer_classification WHERE classification_code = $1 AND is_active = TRUE LIMIT 1", [classificationCode]);
    if (!classification.rows[0]) throw new Error("INVALID_CLASSIFICATION");
    const connectionType = await client.query<{ connection_type_id: string }>("SELECT connection_type_id FROM mt_connection_type WHERE connection_type_code = $1 AND is_active = TRUE LIMIT 1", [connectionTypeCode]);
    if (!connectionType.rows[0]) throw new Error("INVALID_CONNECTION_TYPE");
    const initialStatus = await findInitialAccountStatus(client);
    if (!initialStatus) throw new Error("INITIAL_STATUS_NOT_FOUND");
    const controlNo = await nextControlNumber(client, auth.user.userId);
    await client.query(
      `INSERT INTO service_accounts
         (application_id, customer_id, control_no, classification_id, connection_type_id, connection_status_id, date_connected, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, NULL, $7)`,
      [application.rows[0].application_id, application.rows[0].customer_id, controlNo, classification.rows[0].classification_id, connectionType.rows[0].connection_type_id, initialStatus.connection_status_id, auth.user.userId],
    );
    await client.query("COMMIT");
    return Response.json({ success: true, data: { controlNo }, message: `Service account ${controlNo} was created successfully.` }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    const code = error instanceof Error ? error.message : "";
    if (code === "APPLICATION_NOT_FOUND") return Response.json({ success: false, message: "The service application no longer exists." }, { status: 404 });
    if (code === "NOT_APPROVED") return Response.json({ success: false, message: "Only approved applications can create a service account." }, { status: 409 });
    if (code === "ALREADY_EXISTS" || (typeof error === "object" && error !== null && "code" in error && error.code === "23505")) return Response.json({ success: false, message: "This application already has a service account." }, { status: 409 });
    if (code === "INVALID_CLASSIFICATION") return Response.json({ success: false, message: "The selected classification is unavailable." }, { status: 400 });
    if (code === "INVALID_CONNECTION_TYPE") return Response.json({ success: false, message: "The selected connection type is unavailable." }, { status: 400 });
    if (code === "INITIAL_STATUS_NOT_FOUND") return Response.json({ success: false, message: "A Pending Installation connection status must be configured first." }, { status: 409 });
    console.error("Unable to create service account:", error);
    return Response.json({ success: false, message: "Unable to create the service account." }, { status: 500 });
  } finally { client.release(); }
}
