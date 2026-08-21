import type { PoolClient } from "pg";

export const MUTABLE_INSTALLATION_STATUSES = new Set([
  "SCHEDULED",
  "IN_PROGRESS",
]);

export type MaterialLineInput = {
  materialId: string;
  quantity: string;
  unitCost: string;
};

export const materialLineSelect = `
  SELECT
    sim.installation_material_id::text AS "installationMaterialId",
    sim.installation_id::text AS "installationId",
    sim.material_id::text AS "materialId",
    m.material_code AS "materialCode",
    m.material_name AS "materialName",
    m.unit_id::text AS "unitId",
    u.unit_code AS "unitCode",
    u.unit_name AS "unitName",
    sim.quantity::text AS quantity,
    sim.unit_cost::text AS "unitCost",
    sim.amount::text AS amount,
    sim.created_at::text AS "createdAt"
  FROM service_installation_materials sim
  JOIN mt_material m ON m.material_id=sim.material_id
  JOIN mt_unit_of_measure u ON u.unit_id=m.unit_id`;

export function isId(value: string) {
  return /^\d+$/.test(value);
}

function text(value: unknown, max = 30) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function decimal(value: unknown, scale: number, wholeDigits: number) {
  const parsed = typeof value === "string" ? value.trim() : "";
  const expression = new RegExp(`^\\d{1,${wholeDigits}}(?:\\.\\d{1,${scale}})?$`);
  return expression.test(parsed) ? parsed : null;
}

function isZero(value: string) {
  return /^0+(?:\.0+)?$/.test(value);
}

export function parseMaterialLine(body: Record<string, unknown>) {
  const value: MaterialLineInput = {
    materialId: text(body.materialId),
    quantity: decimal(body.quantity, 3, 11) ?? "",
    unitCost: decimal(body.unitCost, 2, 12) ?? "",
  };
  const errors: Record<string, string> = {};

  if (!isId(value.materialId)) errors.materialId = "Select a valid material.";
  if (!value.quantity || isZero(value.quantity)) {
    errors.quantity = "Enter a quantity greater than zero.";
  }
  if (!value.unitCost) errors.unitCost = "Enter a valid non-negative unit cost.";

  return { value, errors };
}

export function parseMaterialLineUpdate(body: Record<string, unknown>) {
  const value = {
    quantity: decimal(body.quantity, 3, 11) ?? "",
    unitCost: decimal(body.unitCost, 2, 12) ?? "",
  };
  const errors: Record<string, string> = {};

  if (!value.quantity || isZero(value.quantity)) {
    errors.quantity = "Enter a quantity greater than zero.";
  }
  if (!value.unitCost) errors.unitCost = "Enter a valid non-negative unit cost.";

  return { value, errors };
}

export async function lockInstallation(client: PoolClient, installationId: string) {
  const result = await client.query<{ status: string }>(
    `SELECT installation_status AS status
       FROM service_installations
      WHERE installation_id=$1
      FOR UPDATE`,
    [installationId],
  );
  const installation = result.rows[0];
  if (!installation) return { error: "Service installation not found.", status: 404 };
  if (installation.status === "COMPLETED") {
    return { error: "Completed installations are read-only.", status: 409 };
  }
  if (installation.status === "CANCELLED") {
    return { error: "Cancelled installations are read-only.", status: 409 };
  }
  if (!MUTABLE_INSTALLATION_STATUSES.has(installation.status)) {
    return {
      error: "Materials can be changed only while the installation is scheduled or in progress.",
      status: 409,
    };
  }
  return { installation, error: null, status: null };
}
