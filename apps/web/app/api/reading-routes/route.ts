import { Pool } from "pg";
export const runtime = "nodejs";
const globalForDb = globalThis as unknown as { readingRoutesPool?: Pool };
const pool =
  globalForDb.readingRoutesPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForDb.readingRoutesPool = pool;
interface RouteInput {
  code: string;
  name: string;
  barangayId: string | null;
  sequenceNo: number | null;
  description: string | null;
  isActive: boolean;
}
function text(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}
function parse(body: Record<string, unknown>) {
  const barangayId = text(body.barangay_id);
  const rawSequence = body.sequence_no;
  const sequenceNo =
    rawSequence === "" || rawSequence === null || rawSequence === undefined
      ? null
      : Number(rawSequence);
  const route: RouteInput = {
    code: text(body.route_code).toUpperCase(),
    name: text(body.route_name),
    barangayId: barangayId || null,
    sequenceNo,
    description: text(body.description) || null,
    isActive: typeof body.is_active === "boolean" ? body.is_active : true,
  };
  if (!route.code || !route.name)
    return { error: "Please complete all required fields." };
  if (route.barangayId && !/^\d+$/.test(route.barangayId))
    return { error: "Please select a valid barangay." };
  if (route.sequenceNo !== null && !Number.isInteger(route.sequenceNo))
    return { error: "Sequence number must be a valid whole number." };
  return { route };
}
function fail(message: string, status: number) {
  return Response.json({ success: false, message }, { status });
}
function duplicateError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
export async function GET() {
  try {
    const r = await pool.query(
      `SELECT r.route_id, r.route_code, r.route_name, r.barangay_id, b.barangay_name, r.sequence_no, r.description, r.is_active FROM mt_reading_route r LEFT JOIN mt_barangay b ON b.barangay_id = r.barangay_id ORDER BY r.sequence_no NULLS LAST, r.route_code`,
    );
    return Response.json({ success: true, data: r.rows });
  } catch (e) {
    console.error("Failed to load reading routes:", e);
    return fail("Unable to load reading routes.", 500);
  }
}
async function validate(
  client: Pick<Pool, "query">,
  route: RouteInput,
  id?: string,
) {
  if (route.barangayId) {
    const b = await client.query(
      `SELECT barangay_id FROM mt_barangay WHERE barangay_id = $1 LIMIT 1`,
      [route.barangayId],
    );
    if ((b.rowCount ?? 0) === 0)
      return { message: "The selected barangay was not found.", status: 400 };
  }
  const d = await client.query(
    `SELECT route_id FROM mt_reading_route WHERE route_code = $1${id ? " AND route_id <> $2" : ""} LIMIT 1`,
    id ? [route.code, id] : [route.code],
  );
  return (d.rowCount ?? 0) > 0
    ? { message: "That route code is already registered.", status: 409 }
    : null;
}
export async function POST(request: Request) {
  try {
    const p = parse(await request.json());
    if ("error" in p) return fail(p.error ?? "Invalid request.", 400);
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const invalid = await validate(c, p.route);
      if (invalid) {
        await c.query("ROLLBACK");
        return fail(invalid.message, invalid.status);
      }
      const r = await c.query(
        `WITH inserted AS (INSERT INTO mt_reading_route (route_code, route_name, barangay_id, sequence_no, description, is_active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *) SELECT r.route_id, r.route_code, r.route_name, r.barangay_id, b.barangay_name, r.sequence_no, r.description, r.is_active FROM inserted r LEFT JOIN mt_barangay b ON b.barangay_id = r.barangay_id`,
        [
          p.route.code,
          p.route.name,
          p.route.barangayId,
          p.route.sequenceNo,
          p.route.description,
          p.route.isActive,
        ],
      );
      await c.query("COMMIT");
      return Response.json(
        {
          success: true,
          message: "Reading route saved successfully.",
          data: r.rows[0],
        },
        { status: 201 },
      );
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  } catch (e) {
    console.error("Failed to save reading route:", e);
    return fail(
      duplicateError(e)
        ? "That route code is already registered."
        : "The reading route could not be saved.",
      duplicateError(e) ? 409 : 500,
    );
  }
}
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = text(body.route_id);
    const p = parse(body);
    if (!/^\d+$/.test(id)) return fail("Reading route ID is required.", 400);
    if ("error" in p) return fail(p.error ?? "Invalid request.", 400);
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const existing = await c.query(
        `SELECT route_id FROM mt_reading_route WHERE route_id = $1 LIMIT 1`,
        [id],
      );
      if ((existing.rowCount ?? 0) === 0) {
        await c.query("ROLLBACK");
        return fail("Reading route record was not found.", 404);
      }
      const invalid = await validate(c, p.route, id);
      if (invalid) {
        await c.query("ROLLBACK");
        return fail(invalid.message, invalid.status);
      }
      const r = await c.query(
        `WITH updated AS (UPDATE mt_reading_route SET route_code=$1, route_name=$2, barangay_id=$3, sequence_no=$4, description=$5, is_active=$6, updated_at=CURRENT_TIMESTAMP WHERE route_id=$7 RETURNING *) SELECT r.route_id, r.route_code, r.route_name, r.barangay_id, b.barangay_name, r.sequence_no, r.description, r.is_active FROM updated r LEFT JOIN mt_barangay b ON b.barangay_id=r.barangay_id`,
        [
          p.route.code,
          p.route.name,
          p.route.barangayId,
          p.route.sequenceNo,
          p.route.description,
          p.route.isActive,
          id,
        ],
      );
      await c.query("COMMIT");
      return Response.json({
        success: true,
        message: "Reading route updated successfully.",
        data: r.rows[0],
      });
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  } catch (e) {
    console.error("Failed to update reading route:", e);
    return fail(
      duplicateError(e)
        ? "That route code is already registered."
        : "The reading route could not be updated.",
      duplicateError(e) ? 409 : 500,
    );
  }
}
