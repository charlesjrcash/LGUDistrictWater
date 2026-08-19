import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/server-session";

export const runtime = "nodejs";
type ReasonInput = { code: string; name: string; description: string | null; isActive: boolean };
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function fail(message: string, status: number) { return Response.json({ success: false, message }, { status }); }
function duplicateError(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "23505"; }
function parseReason(body: Record<string, unknown>): { reason: ReasonInput } | { error: string } { const code = text(body.reason_code); const name = text(body.reason_name); if (!code) return { error: "Reason Code is required." }; if (!name) return { error: "Reason Name is required." }; return { reason: { code: code.toUpperCase(), name, description: text(body.description) || null, isActive: typeof body.is_active === "boolean" ? body.is_active : true } }; }

export async function GET() { const auth = await requireSessionUser(); if (auth.response) return auth.response; try { const result = await db.query("SELECT reason_id, reason_code, reason_name, description, is_active FROM public.mt_disconnection_reason ORDER BY reason_code ASC"); return Response.json({ success: true, data: result.rows }); } catch (error) { console.error("Failed to load disconnection reasons:", error); return fail("Unable to load disconnection reasons.", 500); } }

export async function POST(request: Request) {
  const auth = await requireSessionUser(); if (auth.response) return auth.response;
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return fail("Invalid request.", 400); }
  const parsed = parseReason(body); if ("error" in parsed) return fail(parsed.error, 400);
  const client = await db.connect();
  try { await client.query("BEGIN"); const duplicate = await client.query("SELECT reason_id FROM public.mt_disconnection_reason WHERE reason_code = $1 LIMIT 1", [parsed.reason.code]); if ((duplicate.rowCount ?? 0) > 0) { await client.query("ROLLBACK"); return fail("That reason code is already registered.", 409); } const result = await client.query("INSERT INTO public.mt_disconnection_reason (reason_code, reason_name, description, is_active, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING reason_id, reason_code, reason_name, description, is_active", [parsed.reason.code, parsed.reason.name, parsed.reason.description, parsed.reason.isActive, auth.user.userId]); await client.query("COMMIT"); return Response.json({ success: true, message: "Disconnection reason saved successfully.", data: result.rows[0] }, { status: 201 }); } catch (error) { await client.query("ROLLBACK"); console.error("Failed to save disconnection reason:", error); return fail(duplicateError(error) ? "That reason code is already registered." : "The disconnection reason could not be saved.", duplicateError(error) ? 409 : 500); } finally { client.release(); }
}

export async function PUT(request: Request) {
  const auth = await requireSessionUser(); if (auth.response) return auth.response;
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return fail("Invalid request.", 400); }
  const reasonId = text(body.reason_id); const parsed = parseReason(body); if (!/^\d+$/.test(reasonId)) return fail("Reason ID is required.", 400); if ("error" in parsed) return fail(parsed.error, 400);
  const client = await db.connect();
  try { await client.query("BEGIN"); const existing = await client.query("SELECT reason_id FROM public.mt_disconnection_reason WHERE reason_id = $1 LIMIT 1", [reasonId]); if ((existing.rowCount ?? 0) === 0) { await client.query("ROLLBACK"); return fail("Disconnection reason not found.", 404); } const duplicate = await client.query("SELECT reason_id FROM public.mt_disconnection_reason WHERE reason_code = $1 AND reason_id <> $2 LIMIT 1", [parsed.reason.code, reasonId]); if ((duplicate.rowCount ?? 0) > 0) { await client.query("ROLLBACK"); return fail("That reason code is already registered.", 409); } const result = await client.query("UPDATE public.mt_disconnection_reason SET reason_code = $1, reason_name = $2, description = $3, is_active = $4, updated_by = $5, updated_at = CURRENT_TIMESTAMP WHERE reason_id = $6 RETURNING reason_id, reason_code, reason_name, description, is_active", [parsed.reason.code, parsed.reason.name, parsed.reason.description, parsed.reason.isActive, auth.user.userId, reasonId]); await client.query("COMMIT"); return Response.json({ success: true, message: "Disconnection reason updated successfully.", data: result.rows[0] }); } catch (error) { await client.query("ROLLBACK"); console.error("Failed to update disconnection reason:", error); return fail(duplicateError(error) ? "That reason code is already registered." : "The disconnection reason could not be updated.", duplicateError(error) ? 409 : 500); } finally { client.release(); }
}
