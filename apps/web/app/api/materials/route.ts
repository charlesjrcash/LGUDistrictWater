import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/server-session";

export const runtime = "nodejs";

type MaterialInput = {
  materialCode: string;
  materialName: string;
  unitId: string;
  description: string | null;
  isActive: boolean;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function fail(message: string, status: number) {
  return Response.json({ success: false, message }, { status });
}

function isDuplicateError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function parseMaterial(
  body: Record<string, unknown>,
): { material: MaterialInput } | { error: string } {
  const material: MaterialInput = {
    materialCode: text(body.material_code).toUpperCase(),
    materialName: text(body.material_name),
    unitId: text(body.unit_id),
    description: text(body.description) || null,
    isActive: typeof body.is_active === "boolean" ? body.is_active : true,
  };

  if (!material.materialCode || !material.materialName || !material.unitId) {
    return { error: "Please complete all required fields." };
  }

  if (!/^\d+$/.test(material.unitId)) {
    return { error: "Selected unit of measure is invalid." };
  }

  return { material };
}

async function unitExists(client: Pick<typeof db, "query">, unitId: string) {
  const result = await client.query(
    "SELECT unit_id FROM public.mt_unit_of_measure WHERE unit_id = $1 LIMIT 1",
    [unitId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function GET() {
  const auth = await requireSessionUser();
  if (auth.response) return auth.response;

  try {
    const result = await db.query(`
      SELECT
        m.material_id,
        m.material_code,
        m.material_name,
        m.unit_id,
        u.unit_name,
        m.description,
        m.is_active
      FROM public.mt_material AS m
      LEFT JOIN public.mt_unit_of_measure AS u ON u.unit_id = m.unit_id
      ORDER BY m.material_code ASC
    `);
    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Failed to load materials:", error);
    return fail("Unable to load materials.", 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if (auth.response) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request.", 400);
  }

  const parsed = parseMaterial(body);
  if ("error" in parsed) return fail(parsed.error ?? "Invalid request.", 400);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const duplicate = await client.query(
      "SELECT material_id FROM public.mt_material WHERE material_code = $1 LIMIT 1",
      [parsed.material.materialCode],
    );
    if ((duplicate.rowCount ?? 0) > 0) {
      await client.query("ROLLBACK");
      return fail("That material code is already registered.", 409);
    }
    if (!(await unitExists(client, parsed.material.unitId))) {
      await client.query("ROLLBACK");
      return fail("Selected unit of measure is invalid.", 400);
    }

    const result = await client.query(
      `
      INSERT INTO public.mt_material (
        material_code, material_name, unit_id, description, is_active, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING material_id, material_code, material_name, unit_id, description, is_active
    `,
      [
        parsed.material.materialCode,
        parsed.material.materialName,
        parsed.material.unitId,
        parsed.material.description,
        parsed.material.isActive,
        auth.user.userId,
      ],
    );
    await client.query("COMMIT");
    return Response.json(
      {
        success: true,
        message: "Material saved successfully.",
        data: result.rows[0],
      },
      { status: 201 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to save material:", error);
    return fail(
      isDuplicateError(error)
        ? "That material code is already registered."
        : "The material could not be saved.",
      isDuplicateError(error) ? 409 : 500,
    );
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  const auth = await requireSessionUser();
  if (auth.response) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request.", 400);
  }

  const materialId = text(body.material_id);
  const parsed = parseMaterial(body);
  if (!/^\d+$/.test(materialId)) return fail("Material ID is required.", 400);
  if ("error" in parsed) return fail(parsed.error ?? "Invalid request.", 400);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT material_id FROM public.mt_material WHERE material_id = $1 LIMIT 1",
      [materialId],
    );
    if ((existing.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      return fail("Material not found.", 404);
    }
    const duplicate = await client.query(
      "SELECT material_id FROM public.mt_material WHERE material_code = $1 AND material_id <> $2 LIMIT 1",
      [parsed.material.materialCode, materialId],
    );
    if ((duplicate.rowCount ?? 0) > 0) {
      await client.query("ROLLBACK");
      return fail("That material code is already registered.", 409);
    }
    if (!(await unitExists(client, parsed.material.unitId))) {
      await client.query("ROLLBACK");
      return fail("Selected unit of measure is invalid.", 400);
    }

    const result = await client.query(
      `
      UPDATE public.mt_material
      SET material_code = $1,
          material_name = $2,
          unit_id = $3,
          description = $4,
          is_active = $5,
          updated_by = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE material_id = $7
      RETURNING material_id, material_code, material_name, unit_id, description, is_active
    `,
      [
        parsed.material.materialCode,
        parsed.material.materialName,
        parsed.material.unitId,
        parsed.material.description,
        parsed.material.isActive,
        auth.user.userId,
        materialId,
      ],
    );
    await client.query("COMMIT");
    return Response.json({
      success: true,
      message: "Material updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to update material:", error);
    return fail(
      isDuplicateError(error)
        ? "That material code is already registered."
        : "The material could not be updated.",
      isDuplicateError(error) ? 409 : 500,
    );
  } finally {
    client.release();
  }
}
