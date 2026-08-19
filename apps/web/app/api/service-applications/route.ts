import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { clean, findWorkflowStatus, isIsoDate, nextApplicationNumber } from "@/modules/service-applications/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requirePermission("SERVICE_APPLICATION_VIEW");
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const search = clean(params.get("search"), 100);
  const status = clean(params.get("status"), 30);
  const type = clean(params.get("type"), 30);
  const date = clean(params.get("date"), 10);
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(5, Number(params.get("pageSize")) || 10));

  if (date && !isIsoDate(date)) {
    return Response.json({ success: false, message: "Invalid application date." }, { status: 400 });
  }

  const values: unknown[] = [];
  const where: string[] = [];
  if (search) {
    values.push(`%${search}%`);
    where.push(`(sa.application_no ILIKE $${values.length} OR c.customer_name ILIKE $${values.length} OR c.customer_no ILIKE $${values.length})`);
  }
  if (status) {
    values.push(status);
    where.push(`s.status_code = $${values.length}`);
  }
  if (type) {
    values.push(type);
    where.push(`t.application_type_code = $${values.length}`);
  }
  if (date) {
    values.push(date);
    where.push(`sa.application_date = $${values.length}::date`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const countValues = [...values];
    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM service_applications sa
         JOIN customers c ON c.customer_id = sa.customer_id
         JOIN mt_application_type t ON t.application_type_id = sa.application_type_id
         JOIN mt_application_status s ON s.application_status_id = sa.application_status_id
         ${whereSql}`,
      countValues,
    );

    values.push(pageSize, (page - 1) * pageSize);
    const rowsResult = await db.query(
      `SELECT sa.application_no AS "applicationNo", c.customer_name AS "customerName",
              c.customer_no AS "customerNo", t.application_type_name AS "applicationType",
              t.application_type_code AS "applicationTypeCode", sa.application_date::text AS "applicationDate",
              s.status_name AS status, s.status_code AS "statusCode"
         FROM service_applications sa
         JOIN customers c ON c.customer_id = sa.customer_id
         JOIN mt_application_type t ON t.application_type_id = sa.application_type_id
         JOIN mt_application_status s ON s.application_status_id = sa.application_status_id
         ${whereSql}
        ORDER BY sa.application_date DESC, sa.application_id DESC
        LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    const summaryResult = await db.query<{
      total: string;
      pending: string;
      processing: string;
      approved: string;
    }>(
      `SELECT COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE UPPER(s.status_code || ' ' || s.status_name) ~ 'PENDING|SUBMIT|NEW')::text AS pending,
              COUNT(*) FILTER (WHERE UPPER(s.status_code || ' ' || s.status_name) ~ 'PROCESS|INSPECT|REVIEW')::text AS processing,
              COUNT(*) FILTER (WHERE UPPER(s.status_code || ' ' || s.status_name) LIKE '%APPROV%')::text AS approved
         FROM service_applications sa
         JOIN mt_application_status s ON s.application_status_id = sa.application_status_id`,
    );

    const total = Number(countResult.rows[0].count);
    return Response.json({
      success: true,
      data: rowsResult.rows,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      summary: Object.fromEntries(Object.entries(summaryResult.rows[0]).map(([key, value]) => [key, Number(value)])),
    });
  } catch (error) {
    console.error("Unable to load service applications:", error);
    return Response.json({ success: false, message: "Unable to load service applications." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission("SERVICE_APPLICATION_CREATE");
  if (auth.response) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, message: "Invalid request." }, { status: 400 });
  }

  const customerNo = clean(body.customerNo, 50);
  const applicationTypeCode = clean(body.applicationTypeCode, 30);
  const connectionTypeCode = clean(body.connectionTypeCode, 30) || null;
  const requestedMeterSizeCode = clean(body.requestedMeterSizeCode, 30) || null;
  const applicationDate = clean(body.applicationDate, 10);
  const remarks = clean(body.remarks, 4000) || null;
  const errors: Record<string, string> = {};
  if (!customerNo) errors.customerNo = "Select a customer.";
  if (!applicationTypeCode) errors.applicationTypeCode = "Select an application type.";
  if (!isIsoDate(applicationDate)) errors.applicationDate = "Enter a valid application date.";
  if (Object.keys(errors).length) return Response.json({ success: false, message: "Check the required fields.", errors }, { status: 400 });

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const [customer, type, connectionType, meterSize, initialStatus] = await Promise.all([
      client.query<{ customer_id: string }>("SELECT customer_id FROM customers WHERE customer_no = $1 LIMIT 1", [customerNo]),
      client.query<{ application_type_id: string }>(
        "SELECT application_type_id FROM mt_application_type WHERE application_type_code = $1 AND is_active = TRUE LIMIT 1",
        [applicationTypeCode],
      ),
      connectionTypeCode
        ? client.query<{ connection_type_id: string }>("SELECT connection_type_id FROM mt_connection_type WHERE connection_type_code = $1 AND is_active = TRUE LIMIT 1", [connectionTypeCode])
        : Promise.resolve({ rows: [] as { connection_type_id: string }[] }),
      requestedMeterSizeCode
        ? client.query<{ meter_size_id: string }>("SELECT meter_size_id FROM mt_meter_size WHERE meter_size = $1 AND is_active = TRUE LIMIT 1", [requestedMeterSizeCode])
        : Promise.resolve({ rows: [] as { meter_size_id: string }[] }),
      findWorkflowStatus(client, "initial"),
    ]);
    if (!customer.rows[0]) throw Object.assign(new Error("CUSTOMER_NOT_FOUND"), { status: 400 });
    if (!type.rows[0]) throw Object.assign(new Error("TYPE_NOT_FOUND"), { status: 400 });
    if (connectionTypeCode && !connectionType.rows[0]) throw Object.assign(new Error("CONNECTION_TYPE_NOT_FOUND"), { status: 400 });
    if (requestedMeterSizeCode && !meterSize.rows[0]) throw Object.assign(new Error("METER_SIZE_NOT_FOUND"), { status: 400 });
    if (!initialStatus) throw Object.assign(new Error("INITIAL_STATUS_NOT_FOUND"), { status: 409 });

    const applicationNo = await nextApplicationNumber(client, auth.user.userId);
    await client.query(
      `INSERT INTO service_applications
         (application_no, customer_id, application_type_id, application_status_id, application_date, connection_type_id, requested_meter_size_id, remarks, created_by)
       VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8, $9)`,
      [applicationNo, customer.rows[0].customer_id, type.rows[0].application_type_id, initialStatus.application_status_id, applicationDate, connectionType.rows[0]?.connection_type_id ?? null, meterSize.rows[0]?.meter_size_id ?? null, remarks, auth.user.userId],
    );
    await client.query("COMMIT");
    return Response.json({ success: true, data: { applicationNo }, message: `Service application ${applicationNo} was created successfully.` }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    const code = error instanceof Error ? error.message : "";
    if (code === "CUSTOMER_NOT_FOUND") return Response.json({ success: false, message: "The selected customer no longer exists." }, { status: 400 });
    if (code === "TYPE_NOT_FOUND") return Response.json({ success: false, message: "The selected application type is unavailable." }, { status: 400 });
    if (code === "CONNECTION_TYPE_NOT_FOUND") return Response.json({ success: false, message: "The selected connection type is unavailable." }, { status: 400 });
    if (code === "METER_SIZE_NOT_FOUND") return Response.json({ success: false, message: "The selected meter size is unavailable." }, { status: 400 });
    if (code === "INITIAL_STATUS_NOT_FOUND") return Response.json({ success: false, message: "A Pending application status must be configured before creating applications." }, { status: 409 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") return Response.json({ success: false, message: "That application number already exists." }, { status: 409 });
    console.error("Unable to create service application:", error);
    return Response.json({ success: false, message: "Unable to save the service application." }, { status: 500 });
  } finally {
    client.release();
  }
}
