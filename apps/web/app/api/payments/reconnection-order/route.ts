import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";

const fail = (message: string, status: number) =>
  Response.json({ success: false, message }, { status });

export async function GET(request: Request) {
  const auth = await requirePermission("BILL_EDIT");
  if (auth.response) return auth.response;

  const serviceAccountId = new URL(request.url).searchParams.get("serviceAccountId")?.trim() || "";
  if (!/^\d+$/.test(serviceAccountId))
    return fail("Select a valid service account.", 400);

  try {
    const result = await db.query(
      `SELECT reconnection_id::text AS "reconnectionId",
              service_account_id::text AS "serviceAccountId",
              fee_amount::text AS "feeAmount",
              status
         FROM reconnection_orders
        WHERE service_account_id=$1 AND status='PENDING'
        ORDER BY reconnection_id`,
      [serviceAccountId],
    );
    if (result.rows.length === 0)
      return fail("No pending reconnection order was found for this service account.", 404);
    if (result.rows.length > 1)
      return fail("Multiple pending reconnection orders were found for this service account. Please resolve them before accepting payment.", 409);
    return Response.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Unable to load pending reconnection order:", error);
    return fail("Unable to load the pending reconnection order.", 500);
  }
}
