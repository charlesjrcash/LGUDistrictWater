import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";
type Context = { params: Promise<{ disconnectionId: string }> };
export async function POST(_: Request, { params }: Context) {
  const auth = await requirePermission("METER_INSTALLATION_EDIT"); if (auth.response) return auth.response;
  const orderId = (await params).disconnectionId;
  if (!/^\d+$/.test(orderId)) return Response.json({ success: false, message: "Disconnection order not found." }, { status: 404 });
  try {
    const result = await db.query(`UPDATE disconnection_orders SET status='CANCELLED',cancelled_by=$1,cancelled_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE disconnection_id=$2 AND status='PENDING' RETURNING disconnection_id::text AS "disconnectionId",cancelled_by::text AS "cancelledBy",cancelled_at::text AS "cancelledAt"`, [auth.user.userId, orderId]);
    if (!result.rows[0]) return Response.json({ success: false, message: "Only pending disconnection orders can be cancelled." }, { status: 409 });
    return Response.json({ success: true, data: result.rows[0], message: "Disconnection order cancelled successfully." });
  } catch (error) { console.error("Unable to cancel disconnection order:", error); return Response.json({ success: false, message: "Unable to cancel the disconnection order." }, { status: 500 }); }
}
