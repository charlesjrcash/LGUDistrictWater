import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/server-session";

export const runtime = "nodejs";
type UnitInput = { code: string; name: string; description: string | null; isActive: boolean };
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function fail(message: string, status: number) { return Response.json({ success: false, message }, { status }); }
function duplicateError(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "23505"; }
function parseUnit(body: Record<string, unknown>): { unit: UnitInput } | { error: string } { const unit = { code: text(body.unit_code).toUpperCase(), name: text(body.unit_name), description: text(body.description) || null, isActive: typeof body.is_active === "boolean" ? body.is_active : true }; return unit.code && unit.name ? { unit } : { error: "Please complete all required fields." }; }

export async function GET(request: Request) {
  const auth = await requireSessionUser(); if (auth.response) return auth.response;
  try { const activeOnly = new URL(request.url).searchParams.get("activeOnly") === "true"; const result = await db.query(`SELECT unit_id, unit_code, unit_name, description, is_active FROM public.mt_unit_of_measure ${activeOnly ? "WHERE is_active = TRUE" : ""} ORDER BY unit_code ASC`); return Response.json({ success: true, data: result.rows }); } catch (error) { console.error("Failed to load units of measure:", error); return fail("Unable to load units of measure.", 500); }
}

export async function POST(request: Request) {
  const auth = await requireSessionUser(); if (auth.response) return auth.response;
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return fail("Invalid request.", 400); }
  const parsed = parseUnit(body); if ("error" in parsed) return fail(parsed.error, 400);
  const client = await db.connect();
  try { await client.query("BEGIN"); const duplicate = await client.query("SELECT unit_id FROM public.mt_unit_of_measure WHERE unit_code = $1 LIMIT 1", [parsed.unit.code]); if ((duplicate.rowCount ?? 0) > 0) { await client.query("ROLLBACK"); return fail("That unit code is already registered.", 409); } const result = await client.query(`INSERT INTO public.mt_unit_of_measure (unit_code, unit_name, description, is_active, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING unit_id, unit_code, unit_name, description, is_active`, [parsed.unit.code, parsed.unit.name, parsed.unit.description, parsed.unit.isActive, auth.user.userId]); await client.query("COMMIT"); return Response.json({ success: true, message: "Unit of measure saved successfully.", data: result.rows[0] }, { status: 201 }); } catch (error) { await client.query("ROLLBACK"); console.error("Failed to save unit of measure:", error); return fail(duplicateError(error) ? "That unit code is already registered." : "The unit of measure could not be saved.", duplicateError(error) ? 409 : 500); } finally { client.release(); }
}

export async function PUT(request: Request) {
  const auth = await requireSessionUser(); if (auth.response) return auth.response;
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return fail("Invalid request.", 400); }
  const unitId = text(body.unit_id); const parsed = parseUnit(body); if (!/^\d+$/.test(unitId)) return fail("Unit of Measure ID is required.", 400); if ("error" in parsed) return fail(parsed.error, 400);
  const client = await db.connect();
  try { await client.query("BEGIN"); const existing = await client.query("SELECT unit_id FROM public.mt_unit_of_measure WHERE unit_id = $1 LIMIT 1", [unitId]); if ((existing.rowCount ?? 0) === 0) { await client.query("ROLLBACK"); return fail("Unit of measure not found.", 404); } const duplicate = await client.query("SELECT unit_id FROM public.mt_unit_of_measure WHERE unit_code = $1 AND unit_id <> $2 LIMIT 1", [parsed.unit.code, unitId]); if ((duplicate.rowCount ?? 0) > 0) { await client.query("ROLLBACK"); return fail("That unit code is already registered.", 409); } const result = await client.query(`UPDATE public.mt_unit_of_measure SET unit_code = $1, unit_name = $2, description = $3, is_active = $4, updated_by = $5, updated_at = CURRENT_TIMESTAMP WHERE unit_id = $6 RETURNING unit_id, unit_code, unit_name, description, is_active`, [parsed.unit.code, parsed.unit.name, parsed.unit.description, parsed.unit.isActive, auth.user.userId, unitId]); await client.query("COMMIT"); return Response.json({ success: true, message: "Unit of measure updated successfully.", data: result.rows[0] }); } catch (error) { await client.query("ROLLBACK"); console.error("Failed to update unit of measure:", error); return fail(duplicateError(error) ? "That unit code is already registered." : "The unit of measure could not be updated.", duplicateError(error) ? 409 : 500); } finally { client.release(); }
}
