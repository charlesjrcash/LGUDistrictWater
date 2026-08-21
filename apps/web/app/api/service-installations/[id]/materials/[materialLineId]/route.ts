import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import {
  isId,
  lockInstallation,
  parseMaterialLineUpdate,
} from "../../../materials-server";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string; materialLineId: string }> };

const fail = (message: string, status: number) =>
  Response.json({ success: false, message }, { status });

export async function PATCH(request: Request, { params }: Context) {
  const auth = await requirePermission("METER_INSTALLATION_EDIT");
  if (auth.response) return auth.response;

  const { id: installationId, materialLineId } = await params;
  if (!isId(installationId)) return fail("Service installation not found.", 404);
  if (!isId(materialLineId)) return fail("Material line not found.", 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request.", 400);
  }
  const { value, errors } = parseMaterialLineUpdate(body);
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

    const result = await client.query(
      `UPDATE service_installation_materials
          SET quantity=$1::numeric,
              unit_cost=$2::numeric,
              amount=$1::numeric*$2::numeric
        WHERE installation_material_id=$3 AND installation_id=$4
        RETURNING installation_material_id::text AS "installationMaterialId",
                  installation_id::text AS "installationId",
                  material_id::text AS "materialId",
                  quantity::text AS quantity,
                  unit_cost::text AS "unitCost",
                  amount::text AS amount,
                  created_at::text AS "createdAt"`,
      [value.quantity, value.unitCost, materialLineId, installationId],
    );
    if (!result.rows[0]) {
      await client.query("ROLLBACK");
      return fail("Material line not found.", 404);
    }
    await client.query("COMMIT");
    return Response.json({
      success: true,
      data: result.rows[0],
      message: "Installation material updated successfully.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Unable to update service installation material:", error);
    return fail("Unable to update the installation material.", 500);
  } finally {
    client.release();
  }
}

export async function DELETE(_: Request, { params }: Context) {
  const auth = await requirePermission("METER_INSTALLATION_EDIT");
  if (auth.response) return auth.response;

  const { id: installationId, materialLineId } = await params;
  if (!isId(installationId)) return fail("Service installation not found.", 404);
  if (!isId(materialLineId)) return fail("Material line not found.", 404);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const locked = await lockInstallation(client, installationId);
    if (locked.error) {
      await client.query("ROLLBACK");
      return fail(locked.error, locked.status!);
    }

    const result = await client.query(
      `DELETE FROM service_installation_materials
        WHERE installation_material_id=$1 AND installation_id=$2
        RETURNING installation_material_id::text AS "installationMaterialId"`,
      [materialLineId, installationId],
    );
    if (!result.rows[0]) {
      await client.query("ROLLBACK");
      return fail("Material line not found.", 404);
    }
    await client.query("COMMIT");
    return Response.json({
      success: true,
      data: result.rows[0],
      message: "Installation material removed successfully.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Unable to remove service installation material:", error);
    return fail("Unable to remove the installation material.", 500);
  } finally {
    client.release();
  }
}
