import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { clean, isIsoDate } from "@/modules/service-applications/server";
import { createAccountFromApplication } from "@/modules/service-accounts/server";

export const runtime = "nodejs";

function creationPayload(body: Record<string, unknown>) {
  const payload = {
    applicationNo: clean(body.applicationNo, 50),
    classificationCode: clean(body.classificationCode, 30),
    connectionTypeCode: clean(body.connectionTypeCode, 30),
    serviceTypeCode: clean(body.serviceTypeCode, 30) || null,
    routeCode: clean(body.routeCode, 30) || null,
    dateConnected: clean(body.dateConnected, 10) || null,
    address: clean(body.address, 4000) || null,
  };
  const errors: Record<string, string> = {};
  if (!payload.applicationNo) errors.applicationNo = "An approved application is required.";
  if (!payload.classificationCode) errors.classificationCode = "Select a classification.";
  if (!payload.connectionTypeCode) errors.connectionTypeCode = "Select a connection type.";
  if (payload.dateConnected && !isIsoDate(payload.dateConnected)) errors.dateConnected = "Enter a valid connection date.";
  return { payload, errors };
}

function creationFailure(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "APPLICATION_NOT_FOUND") return ["Service application not found.", 404] as const;
  if (code === "NOT_APPROVED") return ["Only approved service applications can create a service account.", 409] as const;
  if (code === "APPLICATION_ALREADY_USED") return ["Service account already exists for this application.", 409] as const;
  if (code === "INVALID_CLASSIFICATION") return ["The selected classification is unavailable.", 400] as const;
  if (code === "INVALID_CONNECTION_TYPE") return ["The selected connection type is unavailable.", 400] as const;
  if (code === "INVALID_SERVICE_TYPE") return ["The selected service type is unavailable.", 400] as const;
  if (code === "INVALID_ROUTE") return ["The selected reading route is unavailable.", 400] as const;
  if (code === "ACTIVE_STATUS_NOT_FOUND") return ["An active connection status must be configured before creating a service account.", 409] as const;
  if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") return ["Service account already exists for this application.", 409] as const;
  return null;
}

export async function GET(request: Request) {
  const auth = await requirePermission("SERVICE_ACCOUNT_VIEW");
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
    const count = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM service_accounts acc JOIN customers c ON c.customer_id = acc.customer_id JOIN mt_customer_classification cc ON cc.classification_id = acc.classification_id LEFT JOIN mt_connection_type ct ON ct.connection_type_id = acc.connection_type_id LEFT JOIN mt_connection_status cs ON cs.connection_status_id = acc.connection_status_id ${whereSql}`, values);
    const rows = await db.query(`SELECT acc.control_no AS "controlNo", c.customer_name AS "customerName", c.customer_no AS "customerNo", cc.classification_name AS classification, cc.classification_code AS "classificationCode", COALESCE(ct.connection_type_name, 'Not set') AS "connectionType", COALESCE(ct.connection_type_code, '') AS "connectionTypeCode", st.service_type_name AS "serviceType", rr.route_name AS "readingRoute", acc.date_connected::text AS "dateConnected", COALESCE(cs.status_name, 'Not set') AS status, COALESCE(cs.status_code, '') AS "statusCode" FROM service_accounts acc JOIN customers c ON c.customer_id = acc.customer_id JOIN mt_customer_classification cc ON cc.classification_id = acc.classification_id LEFT JOIN mt_connection_type ct ON ct.connection_type_id = acc.connection_type_id LEFT JOIN mt_connection_status cs ON cs.connection_status_id = acc.connection_status_id LEFT JOIN mt_service_type st ON st.service_type_id = acc.service_type_id LEFT JOIN mt_reading_route rr ON rr.route_id = acc.route_id ${whereSql} ORDER BY acc.created_at DESC, acc.service_account_id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, pageSize, (page - 1) * pageSize]);
    const summary = await db.query<{ total: string; active: string; pending: string; disconnected: string }>(`SELECT COUNT(*)::text AS total, COUNT(*) FILTER (WHERE UPPER(COALESCE(cs.status_code,'')) = 'ACTIVE')::text AS active, COUNT(*) FILTER (WHERE UPPER(COALESCE(cs.status_code,'')) LIKE '%PENDING%')::text AS pending, COUNT(*) FILTER (WHERE UPPER(COALESCE(cs.status_code,'')) LIKE '%DISCONNECT%')::text AS disconnected FROM service_accounts acc LEFT JOIN mt_connection_status cs ON cs.connection_status_id = acc.connection_status_id`);
    const total = Number(count.rows[0].count);
    return Response.json({ success: true, data: rows.rows, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }, summary: Object.fromEntries(Object.entries(summary.rows[0]).map(([key, value]) => [key, Number(value)])) });
  } catch (error) { console.error("Unable to load service accounts:", error); return Response.json({ success: false, message: "Unable to load service accounts." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const auth = await requirePermission("SERVICE_ACCOUNT_CREATE");
  if (auth.response) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ success: false, message: "Invalid request." }, { status: 400 }); }
  const { payload, errors } = creationPayload(body);
  if (Object.keys(errors).length) return Response.json({ success: false, message: "Please complete all required service account information.", errors }, { status: 400 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const created = await createAccountFromApplication(client, { ...payload, userId: auth.user.userId });
    await client.query("COMMIT");
    return Response.json({ success: true, data: created, message: `Service account ${created.controlNo} was created successfully.` }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    const failure = creationFailure(error);
    if (failure) return Response.json({ success: false, message: failure[0] }, { status: failure[1] });
    console.error("Unable to create service account:", error);
    return Response.json({ success: false, message: "Unable to create the service account." }, { status: 500 });
  } finally { client.release(); }
}
