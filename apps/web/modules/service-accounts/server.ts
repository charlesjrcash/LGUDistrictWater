import type { PoolClient } from "pg";

export function classifyAccountStatus(code: string, name = "") {
  const value = `${code} ${name}`.toUpperCase();
  if (value.includes("DISCONNECT")) return "rejected";
  if (value.includes("INACTIVE") || value.includes("CLOSED")) return "neutral";
  if (value.includes("PENDING") || value.includes("INSTALL")) return "pending";
  if (value.includes("ACTIVE") || value.includes("CONNECTED")) return "approved";
  return "neutral";
}

export async function findInitialAccountStatus(client: PoolClient) {
  const preferred = ["PENDING_INSTALLATION", "PENDING INSTALLATION", "FOR_INSTALLATION", "FOR INSTALLATION", "PENDING"];
  const result = await client.query<{ connection_status_id: string; status_code: string; status_name: string }>(
    `SELECT connection_status_id, status_code, status_name
       FROM mt_connection_status
      WHERE is_active = TRUE
        AND (UPPER(status_code) = ANY($1::text[]) OR UPPER(status_name) = ANY($1::text[]))
      ORDER BY CASE UPPER(status_code) WHEN 'PENDING_INSTALLATION' THEN 0 WHEN 'FOR_INSTALLATION' THEN 1 ELSE 2 END,
               connection_status_id
      LIMIT 1`,
    [preferred],
  );
  return result.rows[0] ?? null;
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
