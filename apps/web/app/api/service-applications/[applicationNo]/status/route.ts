import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/server-session";
import { clean, findWorkflowStatus } from "@/modules/service-applications/server";

export const runtime = "nodejs";
type Context = { params: Promise<{ applicationNo: string }> };

export async function POST(request: Request, context: Context) {
  const user = await getSessionUser();
  const applicationNo = decodeURIComponent((await context.params).applicationNo);
  let action = "";
  try {
    action = clean((await request.json()).action, 20).toLowerCase();
  } catch {
    return Response.json({ success: false, message: "Invalid request." }, { status: 400 });
  }
  if (action !== "approve" && action !== "reject") {
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
    const currentLabel = `${current.rows[0].status_code} ${current.rows[0].status_name}`.toUpperCase();
    if (!/(PENDING|SUBMIT|NEW)/.test(currentLabel)) throw new Error("ALREADY_PROCESSED");

    const target = await findWorkflowStatus(client, action);
    if (!target) throw new Error("STATUS_NOT_CONFIGURED");
    await client.query(
      `UPDATE service_applications
          SET application_status_id = $1, updated_by = $2, updated_at = NOW()
        WHERE application_id = $3`,
      [target.application_status_id, user?.userId ?? null, current.rows[0].application_id],
    );
    await client.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_value, new_value, description)
       VALUES ($1, $2, 'service_applications', $3, $4::jsonb, $5::jsonb, $6)`,
      [
        user?.userId ?? null,
        action === "approve" ? "APPROVE" : "REJECT",
        applicationNo,
        JSON.stringify({ statusCode: current.rows[0].status_code, status: current.rows[0].status_name }),
        JSON.stringify({ statusCode: target.status_code, status: target.status_name }),
        `${applicationNo} for ${current.rows[0].customer_name} was ${action === "approve" ? "approved" : "rejected"}.`,
      ],
    );
    await client.query("COMMIT");
    const verb = action === "approve" ? "approved" : "rejected";
    return Response.json({ success: true, message: `Application ${applicationNo} has been ${verb}.` });
  } catch (error) {
    await client.query("ROLLBACK");
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_FOUND") return Response.json({ success: false, message: "Service application not found." }, { status: 404 });
    if (code === "ALREADY_PROCESSED") return Response.json({ success: false, message: "This application has already been processed." }, { status: 409 });
    if (code === "STATUS_NOT_CONFIGURED") return Response.json({ success: false, message: `An ${action === "approve" ? "Approved" : "Rejected"} status is not configured.` }, { status: 409 });
    console.error("Unable to change application status:", error);
    return Response.json({ success: false, message: "Unable to update the application status." }, { status: 500 });
  } finally {
    client.release();
  }
}
