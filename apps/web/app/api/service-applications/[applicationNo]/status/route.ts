import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { allowedWorkflowActions, clean, findWorkflowStatus } from "@/modules/service-applications/server";

export const runtime = "nodejs";
type Context = { params: Promise<{ applicationNo: string }> };

export async function POST(request: Request, context: Context) {
  const auth = await requirePermission("SERVICE_APPLICATION_EDIT");
  if (auth.response) return auth.response;
  const applicationNo = decodeURIComponent((await context.params).applicationNo);
  let action = "";
  try {
    action = clean((await request.json()).action, 20).toLowerCase();
  } catch {
    return Response.json({ success: false, message: "Invalid request." }, { status: 400 });
  }
  if (action !== "inspect" && action !== "approve" && action !== "reject" && action !== "complete") {
    return Response.json({ success: false, message: "Unsupported application action." }, { status: 400 });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{
      application_id: string;
      status_code: string;
      status_name: string;
      customer_name: string;
    }>(
      `SELECT sa.application_id, s.status_code, s.status_name, c.customer_name
         FROM service_applications sa
         JOIN mt_application_status s ON s.application_status_id = sa.application_status_id
         JOIN customers c ON c.customer_id = sa.customer_id
        WHERE sa.application_no = $1 FOR UPDATE OF sa`,
      [applicationNo],
    );
    if (!current.rows[0]) throw new Error("NOT_FOUND");
    if (!allowedWorkflowActions(current.rows[0].status_code, current.rows[0].status_name).includes(action)) throw new Error("INVALID_TRANSITION");
    if (action === "complete") {
      const serviceAccount = await client.query("SELECT service_account_id FROM service_accounts WHERE application_id = $1 LIMIT 1", [current.rows[0].application_id]);
      if (!serviceAccount.rows[0]) throw new Error("SERVICE_ACCOUNT_REQUIRED");
    }

    const target = await findWorkflowStatus(client, action);
    if (!target) throw new Error("STATUS_NOT_CONFIGURED");
    await client.query(
      `UPDATE service_applications
          SET application_status_id = $1, updated_by = $2, updated_at = NOW()
        WHERE application_id = $3`,
      [target.application_status_id, auth.user.userId, current.rows[0].application_id],
    );
    await client.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_value, new_value, description)
       VALUES ($1, $2, 'service_applications', $3, $4::jsonb, $5::jsonb, $6)`,
      [
        auth.user.userId,
        action.toUpperCase(),
        applicationNo,
        JSON.stringify({ statusCode: current.rows[0].status_code, status: current.rows[0].status_name }),
        JSON.stringify({ statusCode: target.status_code, status: target.status_name }),
        `${applicationNo} for ${current.rows[0].customer_name} was moved to ${target.status_name}.`,
      ],
    );
    await client.query("COMMIT");
    return Response.json({ success: true, message: `Application ${applicationNo} was moved to ${target.status_name}.` });
  } catch (error) {
    await client.query("ROLLBACK");
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_FOUND") return Response.json({ success: false, message: "Service application not found." }, { status: 404 });
    if (code === "INVALID_TRANSITION") return Response.json({ success: false, message: "That status transition is not allowed for this application." }, { status: 409 });
    if (code === "SERVICE_ACCOUNT_REQUIRED") return Response.json({ success: false, message: "Create the service account before completing this application." }, { status: 409 });
    if (code === "STATUS_NOT_CONFIGURED") return Response.json({ success: false, message: "The required workflow status is not configured." }, { status: 409 });
    console.error("Unable to change application status:", error);
    return Response.json({ success: false, message: "Unable to update the application status." }, { status: 500 });
  } finally {
    client.release();
  }
}
