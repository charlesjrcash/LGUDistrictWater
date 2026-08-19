import type { PoolClient } from "pg";

export function classifyAccountStatus(code: string, name = "") {
  const value = `${code} ${name}`.toUpperCase();
  if (value.includes("DISCONNECT")) return "rejected";
  if (value.includes("INACTIVE") || value.includes("CLOSED")) return "neutral";
  if (value.includes("PENDING") || value.includes("INSTALL")) return "pending";
  if (value.includes("ACTIVE") || value.includes("CONNECTED")) return "approved";
  return "neutral";
}

export async function findActiveAccountStatus(client: PoolClient) {
  const preferred = ["ACTIVE"];
  const result = await client.query<{ connection_status_id: string; status_code: string; status_name: string }>(
    `SELECT connection_status_id, status_code, status_name
       FROM mt_connection_status
      WHERE is_active = TRUE
        AND (UPPER(status_code) = ANY($1::text[]) OR UPPER(status_name) = ANY($1::text[]))
      ORDER BY connection_status_id
      LIMIT 1`,
    [preferred],
  );
  return result.rows[0] ?? null;
}

export type AccountCreationInput = {
  applicationNo: string;
  classificationCode: string;
  connectionTypeCode: string;
  serviceTypeCode: string | null;
  routeCode: string | null;
  dateConnected: string | null;
  address: string | null;
  userId: string;
};

export async function createAccountFromApplication(client: PoolClient, input: AccountCreationInput) {
  const application = await client.query<{ application_id: string; customer_id: string; status_code: string; status_name: string }>(
    `SELECT sa.application_id, sa.customer_id, ast.status_code, ast.status_name
       FROM service_applications sa
       JOIN mt_application_status ast ON ast.application_status_id = sa.application_status_id
      WHERE sa.application_no = $1 FOR UPDATE OF sa`,
    [input.applicationNo],
  );
  if (!application.rows[0]) throw new Error("APPLICATION_NOT_FOUND");
  if (!`${application.rows[0].status_code} ${application.rows[0].status_name}`.toUpperCase().includes("APPROV")) throw new Error("NOT_APPROVED");

  const existing = await client.query<{ control_no: string }>("SELECT control_no FROM service_accounts WHERE application_id = $1 LIMIT 1", [application.rows[0].application_id]);
  if (existing.rows[0]) throw new Error("APPLICATION_ALREADY_USED");

  const [classification, connectionType, serviceType, route, activeStatus] = await Promise.all([
    client.query<{ classification_id: string }>("SELECT classification_id FROM mt_customer_classification WHERE classification_code = $1 AND is_active = TRUE LIMIT 1", [input.classificationCode]),
    client.query<{ connection_type_id: string }>("SELECT connection_type_id FROM mt_connection_type WHERE connection_type_code = $1 AND is_active = TRUE LIMIT 1", [input.connectionTypeCode]),
    input.serviceTypeCode ? client.query<{ service_type_id: string }>("SELECT service_type_id FROM mt_service_type WHERE service_type_code = $1 AND is_active = TRUE LIMIT 1", [input.serviceTypeCode]) : Promise.resolve({ rows: [] as { service_type_id: string }[] }),
    input.routeCode ? client.query<{ route_id: string }>("SELECT route_id FROM mt_reading_route WHERE route_code = $1 AND is_active = TRUE LIMIT 1", [input.routeCode]) : Promise.resolve({ rows: [] as { route_id: string }[] }),
    findActiveAccountStatus(client),
  ]);
  if (!classification.rows[0]) throw new Error("INVALID_CLASSIFICATION");
  if (!connectionType.rows[0]) throw new Error("INVALID_CONNECTION_TYPE");
  if (input.serviceTypeCode && !serviceType.rows[0]) throw new Error("INVALID_SERVICE_TYPE");
  if (input.routeCode && !route.rows[0]) throw new Error("INVALID_ROUTE");
  if (!activeStatus) throw new Error("ACTIVE_STATUS_NOT_FOUND");

  const controlNo = await nextControlNumber(client, input.userId);
  const created = await client.query<{ control_no: string }>(
    `INSERT INTO service_accounts
       (application_id, customer_id, control_no, classification_id, connection_type_id, connection_status_id, service_type_id, route_id, date_connected, address, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10, $11)
     RETURNING control_no`,
    [application.rows[0].application_id, application.rows[0].customer_id, controlNo, classification.rows[0].classification_id, connectionType.rows[0].connection_type_id, activeStatus.connection_status_id, serviceType.rows[0]?.service_type_id ?? null, route.rows[0]?.route_id ?? null, input.dateConnected, input.address, input.userId],
  );
  return { controlNo: created.rows[0].control_no };
}

export async function nextControlNumber(client: PoolClient, userId: string | null) {
  const seriesResult = await client.query<{
    series_id: string;
    prefix: string | null;
    current_number: string;
    padding_length: number;
  }>(
    `SELECT series_id, prefix, current_number, padding_length
       FROM mt_document_series
      WHERE is_active = TRUE
        AND UPPER(REPLACE(document_type, ' ', '_')) IN ('SERVICE_ACCOUNT', 'SERVICE_ACCOUNTS', 'CONTROL_NUMBER')
      ORDER BY series_id
      FOR UPDATE
      LIMIT 1`,
  );
  const series = seriesResult.rows[0];
  if (series) {
    const next = BigInt(series.current_number) + BigInt(1);
    await client.query(
      "UPDATE mt_document_series SET current_number = $1, updated_by = $2, updated_at = NOW() WHERE series_id = $3",
      [next.toString(), userId, series.series_id],
    );
    return `${series.prefix || "SA-"}${next.toString().padStart(series.padding_length || 5, "0")}`;
  }

  await client.query("SELECT pg_advisory_xact_lock(hashtext('service_accounts.control_no'))");
  const maxResult = await client.query<{ next_number: string }>(
    `SELECT COALESCE(MAX((regexp_match(control_no, '^SA-([0-9]+)$'))[1]::bigint), 0) + 1 AS next_number
       FROM service_accounts`,
  );
  return `SA-${maxResult.rows[0].next_number.padStart(5, "0")}`;
}
