import type { PoolClient } from "pg";

export function clean(value: unknown, maxLength = 200) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function classifyStatus(code: string, name = "") {
  const value = `${code} ${name}`.toUpperCase();
  if (value.includes("APPROV")) return "approved";
  if (value.includes("REJECT") || value.includes("DENIED")) return "rejected";
  if (value.includes("PROCESS") || value.includes("INSPECT") || value.includes("REVIEW")) return "processing";
  if (value.includes("PENDING") || value.includes("SUBMIT") || value.includes("NEW")) return "pending";
  return "neutral";
}

export async function findWorkflowStatus(client: PoolClient, action: "initial" | "approve" | "reject") {
  const patterns = {
    initial: ["PENDING", "SUBMITTED", "NEW"],
    approve: ["APPROVED", "APPROVE"],
    reject: ["REJECTED", "REJECT", "DENIED"],
  }[action];

  const result = await client.query<{ application_status_id: string; status_code: string; status_name: string }>(
    `SELECT application_status_id, status_code, status_name
       FROM mt_application_status
      WHERE is_active = TRUE
        AND (UPPER(status_code) = ANY($1::text[]) OR UPPER(status_name) = ANY($1::text[]))
      ORDER BY CASE UPPER(status_code) WHEN $2 THEN 0 ELSE 1 END, application_status_id
      LIMIT 1`,
    [patterns, patterns[0]],
  );
  return result.rows[0] ?? null;
}

export async function nextApplicationNumber(client: PoolClient, userId: string | null) {
  const seriesResult = await client.query<{
    series_id: string;
    prefix: string | null;
    current_number: string;
    padding_length: number;
  }>(
    `SELECT series_id, prefix, current_number, padding_length
       FROM mt_document_series
      WHERE is_active = TRUE
        AND UPPER(REPLACE(document_type, ' ', '_')) IN ('SERVICE_APPLICATION', 'SERVICE_APPLICATIONS', 'APPLICATION')
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
    return `${series.prefix || "APP-"}${next.toString().padStart(series.padding_length || 6, "0")}`;
  }

  await client.query("SELECT pg_advisory_xact_lock(hashtext('service_applications.application_no'))");
  const maxResult = await client.query<{ next_number: string }>(
    `SELECT COALESCE(MAX((regexp_match(application_no, '^APP-([0-9]+)$'))[1]::bigint), 0) + 1 AS next_number
       FROM service_applications`,
  );
  return `APP-${maxResult.rows[0].next_number.padStart(6, "0")}`;
}
