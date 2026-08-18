import type { PoolClient } from "pg";

export async function nextCustomerNumber(client: PoolClient, userId: string) {
  const seriesResult = await client.query<{ series_id: string; prefix: string | null; current_number: string; padding_length: number }>(
    `SELECT series_id, prefix, current_number, padding_length
       FROM mt_document_series
      WHERE is_active = TRUE
        AND UPPER(REPLACE(document_type, ' ', '_')) IN ('CUSTOMER', 'CUSTOMERS', 'CUSTOMER_NUMBER')
      ORDER BY series_id FOR UPDATE LIMIT 1`,
  );
  const series = seriesResult.rows[0];
  if (series) {
    const next = BigInt(series.current_number) + BigInt(1);
    await client.query("UPDATE mt_document_series SET current_number=$1, updated_by=$2, updated_at=NOW() WHERE series_id=$3", [next.toString(), userId, series.series_id]);
    return `${series.prefix || "CUS-"}${next.toString().padStart(series.padding_length || 5, "0")}`;
  }
  await client.query("SELECT pg_advisory_xact_lock(hashtext('customers.customer_no'))");
  const result = await client.query<{ next_number: string }>(`SELECT COALESCE(MAX((regexp_match(customer_no, '^CUS-([0-9]+)$'))[1]::bigint),0)+1 AS next_number FROM customers`);
  return `CUS-${result.rows[0].next_number.padStart(5, "0")}`;
}

export function normalizeCustomerPayload(body: Record<string, unknown>) {
  const value = (input: unknown, max: number) => typeof input === "string" ? input.trim().slice(0, max) : "";
  return {
    customerName: value(body.customerName, 200), firstName: value(body.firstName, 100) || null,
    middleName: value(body.middleName, 100) || null, lastName: value(body.lastName, 100) || null,
    address: value(body.address, 1000) || null, barangayCode: value(body.barangayCode, 20) || null,
    purokCode: value(body.purokCode, 20) || null, contactNo: value(body.contactNo, 50) || null,
    email: value(body.email, 150).toLowerCase() || null, status: value(body.status, 30).toUpperCase() || "ACTIVE",
  };
}

export function validateCustomer(payload: ReturnType<typeof normalizeCustomerPayload>) {
  const errors: Record<string, string> = {};
  if (!payload.customerName) errors.customerName = "Enter the customer name.";
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) errors.email = "Enter a valid email address.";
  if (payload.contactNo && !/^[+\d][\d\s().-]{6,24}$/.test(payload.contactNo)) errors.contactNo = "Enter a valid contact number.";
  if (!['ACTIVE','INACTIVE'].includes(payload.status)) errors.status = "Select a valid customer status.";
  return errors;
}

export async function findSimilarCustomers(client: PoolClient, payload: ReturnType<typeof normalizeCustomerPayload>, excludeCustomerNo?: string) {
  const result = await client.query<{ customerNo: string; name: string; address: string | null; contactNo: string | null }>(
    `SELECT customer_no AS "customerNo", customer_name AS name, address, contact_no AS "contactNo"
       FROM customers
      WHERE ($4::text IS NULL OR customer_no <> $4)
        AND UPPER(customer_name) = UPPER($1)
        AND (($2::text IS NOT NULL AND regexp_replace(COALESCE(contact_no,''),'[^0-9]','','g') = regexp_replace($2,'[^0-9]','','g'))
          OR ($3::text IS NOT NULL AND UPPER(COALESCE(address,'')) = UPPER($3)))
      ORDER BY customer_no LIMIT 5`,
    [payload.customerName, payload.contactNo, payload.address, excludeCustomerNo || null],
  );
  return result.rows;
}
