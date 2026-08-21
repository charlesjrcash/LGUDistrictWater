import { db } from "@/lib/db";
import { requireAnyPermission } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAnyPermission([
    "METER_INSTALLATION_CREATE",
    "METER_INSTALLATION_EDIT",
  ]);
  if (auth.response) return auth.response;

  try {
    const result = await db.query(
      `SELECT m.material_id::text AS "materialId",
              m.material_code AS "materialCode",
              m.material_name AS "materialName",
              m.unit_id::text AS "unitId",
              u.unit_code AS "unitCode",
              u.unit_name AS "unitName"
         FROM mt_material m
         JOIN mt_unit_of_measure u ON u.unit_id=m.unit_id
        WHERE m.is_active=TRUE
        ORDER BY m.material_code`,
    );
    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Unable to load service installation material options:", error);
    return Response.json(
      { success: false, message: "Unable to load material options." },
      { status: 500 },
    );
  }
}
