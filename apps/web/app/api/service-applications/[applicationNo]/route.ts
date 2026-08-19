import { db } from "@/lib/db";
import { requireAnyPermission, requirePermission } from "@/lib/permissions";
import { clean, isIsoDate } from "@/modules/service-applications/server";

export const runtime = "nodejs";

type Context = { params: Promise<{ applicationNo: string }> };

export async function GET(_request: Request, context: Context) {
  const auth = await requireAnyPermission(["SERVICE_APPLICATION_VIEW", "SERVICE_APPLICATION_EDIT"]);
  if (auth.response) return auth.response;
  const applicationNo = decodeURIComponent((await context.params).applicationNo);

  try {
    const [detail, statuses] = await Promise.all([
      db.query(
        `SELECT sa.application_no AS "applicationNo", c.customer_name AS "customerName",
                c.customer_no AS "customerNo", t.application_type_name AS "applicationType",
                t.application_type_code AS "applicationTypeCode", sa.application_date::text AS "applicationDate",
                s.status_name AS status, s.status_code AS "statusCode", sa.remarks,
                ct.connection_type_name AS "connectionType", ct.connection_type_code AS "connectionTypeCode",
                ms.meter_size AS "requestedMeterSize", ms.meter_size AS "requestedMeterSizeCode",
                sa.investigation_date::text AS "investigationDate", sa.investigation_result AS "investigationResult",
                sa.inspection_date::text AS "inspectionDate", sa.inspection_result AS "inspectionResult",
                acc.control_no AS "serviceAccountControlNo",
                sa.created_at::text AS "createdAt", sa.updated_at::text AS "updatedAt",
                json_build_object(
                  'customerNo', c.customer_no, 'name', c.customer_name, 'address', c.address,
                  'barangay', b.barangay_name, 'contactNo', c.contact_no, 'status', c.status
                ) AS customer
           FROM service_applications sa
           JOIN customers c ON c.customer_id = sa.customer_id
           LEFT JOIN mt_barangay b ON b.barangay_id = c.barangay_id
           JOIN mt_application_type t ON t.application_type_id = sa.application_type_id
           JOIN mt_application_status s ON s.application_status_id = sa.application_status_id
           LEFT JOIN mt_connection_type ct ON ct.connection_type_id = sa.connection_type_id
           LEFT JOIN mt_meter_size ms ON ms.meter_size_id = sa.requested_meter_size_id
           LEFT JOIN service_accounts acc ON acc.application_id = sa.application_id
          WHERE sa.application_no = $1
          LIMIT 1`,
        [applicationNo],
      ),
      db.query(
        `SELECT status_code AS code, status_name AS name, description
           FROM mt_application_status WHERE is_active = TRUE ORDER BY application_status_id`,
      ),
    ]);
    if (!detail.rows[0]) return Response.json({ success: false, message: "Service application not found." }, { status: 404 });
    return Response.json({ success: true, data: { ...detail.rows[0], statuses: statuses.rows } });
  } catch (error) {
    console.error("Unable to load service application:", error);
    return Response.json({ success: false, message: "Unable to load the service application." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: Context) {
  const auth = await requirePermission("SERVICE_APPLICATION_EDIT");
  if (auth.response) return auth.response;
  const applicationNo = decodeURIComponent((await context.params).applicationNo);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, message: "Invalid request." }, { status: 400 });
  }
  const applicationTypeCode = clean(body.applicationTypeCode, 30);
  const connectionTypeCode = clean(body.connectionTypeCode, 30) || null;
  const requestedMeterSizeCode = clean(body.requestedMeterSizeCode, 30) || null;
  const applicationDate = clean(body.applicationDate, 10);
  const remarks = clean(body.remarks, 4000) || null;
  const errors: Record<string, string> = {};
  if (!applicationTypeCode) errors.applicationTypeCode = "Select an application type.";
  if (!isIsoDate(applicationDate)) errors.applicationDate = "Enter a valid application date.";
  if (Object.keys(errors).length) return Response.json({ success: false, message: "Check the required fields.", errors }, { status: 400 });

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ application_id: string; status_code: string; status_name: string }>(
      `SELECT sa.application_id, s.status_code, s.status_name
         FROM service_applications sa
         JOIN mt_application_status s ON s.application_status_id = sa.application_status_id
        WHERE sa.application_no = $1 FOR UPDATE OF sa`,
      [applicationNo],
    );
    if (!current.rows[0]) throw Object.assign(new Error("NOT_FOUND"), { status: 404 });
    const status = `${current.rows[0].status_code} ${current.rows[0].status_name}`.toUpperCase();
    if (!/(PENDING|SUBMIT|NEW)/.test(status)) throw Object.assign(new Error("NOT_EDITABLE"), { status: 409 });

    const [type, connectionType, meterSize] = await Promise.all([
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
    ]);
    if (!type.rows[0]) throw Object.assign(new Error("TYPE_NOT_FOUND"), { status: 400 });
    if (connectionTypeCode && !connectionType.rows[0]) throw Object.assign(new Error("CONNECTION_TYPE_NOT_FOUND"), { status: 400 });
    if (requestedMeterSizeCode && !meterSize.rows[0]) throw Object.assign(new Error("METER_SIZE_NOT_FOUND"), { status: 400 });
    await client.query(
      `UPDATE service_applications
          SET application_type_id = $1, application_date = $2::date, connection_type_id = $3,
              requested_meter_size_id = $4, remarks = $5, updated_by = $6, updated_at = NOW()
        WHERE application_id = $7`,
      [type.rows[0].application_type_id, applicationDate, connectionType.rows[0]?.connection_type_id ?? null, meterSize.rows[0]?.meter_size_id ?? null, remarks, auth.user.userId, current.rows[0].application_id],
    );
    await client.query("COMMIT");
    return Response.json({ success: true, message: `Application ${applicationNo} was updated successfully.` });
  } catch (error) {
    await client.query("ROLLBACK");
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_FOUND") return Response.json({ success: false, message: "Service application not found." }, { status: 404 });
    if (code === "NOT_EDITABLE") return Response.json({ success: false, message: "Only pending applications can be edited." }, { status: 409 });
    if (code === "TYPE_NOT_FOUND") return Response.json({ success: false, message: "The selected application type is unavailable." }, { status: 400 });
    if (code === "CONNECTION_TYPE_NOT_FOUND") return Response.json({ success: false, message: "The selected connection type is unavailable." }, { status: 400 });
    if (code === "METER_SIZE_NOT_FOUND") return Response.json({ success: false, message: "The selected meter size is unavailable." }, { status: 400 });
    console.error("Unable to update service application:", error);
    return Response.json({ success: false, message: "Unable to update the service application." }, { status: 500 });
  } finally {
    client.release();
  }
}
