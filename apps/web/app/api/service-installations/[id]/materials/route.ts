import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import {
  isId,
  lockInstallation,
  materialLineSelect,
  parseMaterialLine,
} from "../../materials-server";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

const fail = (message: string, status: number) =>
  Response.json({ success: false, message }, { status });

export async function GET(_: Request, { params }: Context) {
  const auth = await requirePermission("METER_INSTALLATION_VIEW");
  if (auth.response) return auth.response;

  const installationId = (await params).id;
  if (!isId(installationId)) return fail("Service installation not found.", 404);

  try {
    const installation = await db.query(
      "SELECT installation_id FROM service_installations WHERE installation_id=$1",
      [installationId],
    );
    if (!installation.rows[0]) return fail("Service installation not found.", 404);

    const [lines, summary] = await Promise.all([
      db.query(`${materialLineSelect} WHERE sim.installation_id=$1 ORDER BY sim.installation_material_id`, [installationId]),
      db.query<{ totalMaterialCost: string }>(
        `SELECT COALESCE(SUM(amount),0)::text AS "totalMaterialCost"
           FROM service_installation_materials
          WHERE installation_id=$1`,
        [installationId],
      ),
    ]);
    return Response.json({
      success: true,
      data: lines.rows,
      totalMaterialCost: summary.rows[0]?.totalMaterialCost ?? "0",
    });
  } catch (error) {
    console.error("Unable to load service installation materials:", error);
    return fail("Unable to load service installation materials.", 500);
  }
}

export async function POST(request: Request, { params }: Context) {
  const auth = await requirePermission("METER_INSTALLATION_EDIT");
  if (auth.response) return auth.response;

  const installationId = (await params).id;
  if (!isId(installationId)) return fail("Service installation not found.", 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request.", 400);
  }
  const { value, errors } = parseMaterialLine(body);
  if (Object.keys(errors).length) {
    return Response.json(
      { success: false, message: "Please correct the material information.", errors },
      { status: 400 },
    );
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const locked = await lockInstallation(client, installationId);
    if (locked.error) {
      await client.query("ROLLBACK");
      return fail(locked.error, locked.status!);
    }

    const material = await client.query(
      "SELECT material_id FROM mt_material WHERE material_id=$1 AND is_active=TRUE",
      [value.materialId],
    );
    if (!material.rows[0]) {
      await client.query("ROLLBACK");
      return fail("The selected material is unavailable or inactive.", 400);
    }

    const duplicate = await client.query(
      `SELECT installation_material_id
         FROM service_installation_materials
        WHERE installation_id=$1 AND material_id=$2`,
      [installationId, value.materialId],
    );
    if (duplicate.rows[0]) {
      await client.query("ROLLBACK");
      return fail("This material is already included in the installation.", 409);
    }

    const result = await client.query(
      `INSERT INTO service_installation_materials(installation_id,material_id,quantity,unit_cost,amount)
       VALUES($1,$2,$3::numeric,$4::numeric,$3::numeric*$4::numeric)
       RETURNING installation_material_id::text AS "installationMaterialId",
                 installation_id::text AS "installationId",
                 material_id::text AS "materialId",
                 quantity::text AS quantity,
                 unit_cost::text AS "unitCost",
                 amount::text AS amount,
                 created_at::text AS "createdAt"`,
      [installationId, value.materialId, value.quantity, value.unitCost],
    );
    await client.query("COMMIT");
    return Response.json(
      { success: true, data: result.rows[0], message: "Material added to the installation." },
      { status: 201 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Unable to add service installation material:", error);
    return fail("Unable to add the material to the installation.", 500);
  } finally {
    client.release();
  }
}
