import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { clean, isIsoDate } from "@/modules/service-applications/server";
import { createAccountFromApplication } from "@/modules/service-accounts/server";

export const runtime = "nodejs";
type Context = { params: Promise<{ applicationNo: string }> };

export async function GET(_request: Request, context: Context) {
  const auth = await requirePermission("SERVICE_ACCOUNT_CREATE");
  if (auth.response) return auth.response;
  const applicationNo = decodeURIComponent(
    (await context.params).applicationNo,
  );
  try {
    const result = await db.query(
      `SELECT json_build_object(
                'applicationNo', sa.application_no, 'applicationType', at.application_type_name,
                'applicationDate', sa.application_date::text, 'status', ast.status_name, 'statusCode', ast.status_code
              ) AS application,
              json_build_object(
                'customerNo', c.customer_no, 'name', c.customer_name, 'address', c.address,
                'barangay', b.barangay_name, 'contactNo', c.contact_no, 'status', c.status
              ) AS customer,
              acc.control_no AS "existingControlNo"
         FROM service_applications sa
         JOIN customers c ON c.customer_id = sa.customer_id
         LEFT JOIN mt_barangay b ON b.barangay_id = c.barangay_id
         JOIN mt_application_type at ON at.application_type_id = sa.application_type_id
         JOIN mt_application_status ast ON ast.application_status_id = sa.application_status_id
         LEFT JOIN service_accounts acc ON acc.application_id = sa.application_id
        WHERE sa.application_no = $1
        LIMIT 1`,
      [applicationNo],
    );
    if (!result.rows[0])
      return Response.json(
        { success: false, message: "Service application not found." },
        { status: 404 },
      );
    return Response.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Unable to load approved application context:", error);
    return Response.json(
      { success: false, message: "Unable to load the approved application." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: Context) {
  const auth = await requirePermission("SERVICE_ACCOUNT_CREATE");
  if (auth.response) return auth.response;
  const applicationNo = decodeURIComponent((await context.params).applicationNo);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ success: false, message: "Invalid request." }, { status: 400 }); }
  const classificationCode = clean(body.classificationCode, 30);
  const connectionTypeCode = clean(body.connectionTypeCode, 30);
  const serviceTypeCode = clean(body.serviceTypeCode, 30) || null;
  const routeCode = clean(body.routeCode, 30) || null;
  const dateConnected = clean(body.dateConnected, 10) || null;
  const address = clean(body.address, 4000) || null;
  const errors: Record<string, string> = {};
  if (!classificationCode) errors.classificationCode = "Select a classification.";
  if (!connectionTypeCode) errors.connectionTypeCode = "Select a connection type.";
  if (dateConnected && !isIsoDate(dateConnected)) errors.dateConnected = "Enter a valid connection date.";
  if (Object.keys(errors).length) return Response.json({ success: false, message: "Please complete all required service account information.", errors }, { status: 400 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const created = await createAccountFromApplication(client, { applicationNo, classificationCode, connectionTypeCode, serviceTypeCode, routeCode, dateConnected, address, userId: auth.user.userId });
    await client.query("COMMIT");
    return Response.json({ success: true, data: created, message: `Service account ${created.controlNo} was created successfully.` }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    const code = error instanceof Error ? error.message : "";
    const failures: Record<string, [string, number]> = {
      APPLICATION_NOT_FOUND: ["Service application not found.", 404], NOT_APPROVED: ["Only approved service applications can create a service account.", 409], APPLICATION_ALREADY_USED: ["Service account already exists for this application.", 409], INVALID_CLASSIFICATION: ["The selected classification is unavailable.", 400], INVALID_CONNECTION_TYPE: ["The selected connection type is unavailable.", 400], INVALID_SERVICE_TYPE: ["The selected service type is unavailable.", 400], INVALID_ROUTE: ["The selected reading route is unavailable.", 400], ACTIVE_STATUS_NOT_FOUND: ["An active connection status must be configured before creating a service account.", 409],
    };
    if (failures[code]) return Response.json({ success: false, message: failures[code][0] }, { status: failures[code][1] });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") return Response.json({ success: false, message: "Service account already exists for this application." }, { status: 409 });
    console.error("Unable to create service account from application:", error);
    return Response.json({ success: false, message: "Unable to create the service account." }, { status: 500 });
  } finally { client.release(); }
}
