import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { recalculateBill } from "@/modules/bills/server";

export const runtime = "nodejs";
type Context = { params: Promise<{ adjustmentId: string }> };
const fail = (message: string, status: number) => Response.json({ success: false, message }, { status });

export async function POST(_: Request, { params }: Context) {
  const auth = await requirePermission("BILL_EDIT");
  if (auth.response) return auth.response;
  const adjustmentId = (await params).adjustmentId;
  if (!/^\d+$/.test(adjustmentId)) return fail("Bill adjustment not found.", 404);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const adjustment = await client.query<{ bill_id: string; approved_at: string | null }>("SELECT bill_id::text,approved_at::text FROM bill_adjustments WHERE adjustment_id=$1 FOR UPDATE", [adjustmentId]);
    if (!adjustment.rows[0]) { await client.query("ROLLBACK"); return fail("Bill adjustment not found.", 404); }
    if (adjustment.rows[0].approved_at) { await client.query("ROLLBACK"); return fail("Adjustment is already approved.", 409); }
    const result = await client.query(`UPDATE bill_adjustments SET approved_by=$1,approved_at=NOW() WHERE adjustment_id=$2 AND approved_at IS NULL RETURNING adjustment_id AS "adjustmentId",bill_id::text AS "billId",approved_at::text AS "approvedAt"`, [auth.user.userId, adjustmentId]);
    if (!result.rows[0]) { await client.query("ROLLBACK"); return fail("Adjustment is no longer pending approval.", 409); }
    await recalculateBill(client, result.rows[0].billId, auth.user.userId);
    await client.query("COMMIT");
    return Response.json({ success: true, data: result.rows[0], message: "Adjustment approved successfully." });
  } catch (error) { await client.query("ROLLBACK"); console.error("Unable to approve bill adjustment:", error); return fail("Unable to approve adjustment.", 500); } finally { client.release(); }
}
