import type { PoolClient } from "pg";

export type BillInput = {
  serviceAccountId: string; billingPeriodId: string; readingId: string | null;
  billDate: string; dueDate: string | null; waterConsumptionAmount: string;
  previousBalance: string; penaltyAmount: string; connectionFeeAmount: string;
  adjustmentAmount: string; status: string; remarks: string | null;
};

const text = (value: unknown, maximum = 4000) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
const id = (value: string) => /^\d+$/.test(value);
const date = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const amount = (value: string, negative = false) => new RegExp(`^${negative ? "-?" : ""}\\d+(\\.\\d{1,2})?$`).test(value);

export function parseBill(body: Record<string, unknown>, editable = false) {
  const value: BillInput = {
    serviceAccountId: text(body.serviceAccountId, 30), billingPeriodId: text(body.billingPeriodId, 30), readingId: text(body.readingId, 30) || null,
    billDate: text(body.billDate, 10), dueDate: text(body.dueDate, 10) || null,
    waterConsumptionAmount: text(body.waterConsumptionAmount, 30), previousBalance: text(body.previousBalance, 30), penaltyAmount: text(body.penaltyAmount, 30), connectionFeeAmount: text(body.connectionFeeAmount, 30), adjustmentAmount: text(body.adjustmentAmount, 30),
    status: text(body.status, 30) || "UNPAID", remarks: text(body.remarks) || null,
  };
  const errors: Record<string, string> = {};
  if (!editable && !id(value.serviceAccountId)) errors.serviceAccountId = "Select a service account.";
  if (!editable && !id(value.billingPeriodId)) errors.billingPeriodId = "Select a billing period.";
  if (!editable && value.readingId && !id(value.readingId)) errors.readingId = "Select a valid meter reading.";
  if (!date(value.billDate)) errors.billDate = "Enter a valid bill date.";
  if (value.dueDate && !date(value.dueDate)) errors.dueDate = "Enter a valid due date.";
  for (const [key, label, allowsNegative] of [["waterConsumptionAmount", "water consumption amount", false], ["previousBalance", "previous balance", false], ["penaltyAmount", "penalty amount", false], ["connectionFeeAmount", "connection fee amount", false], ["adjustmentAmount", "adjustment amount", true]] as const) if (!amount(value[key], allowsNegative)) errors[key] = `Enter a valid ${label}.`;
  if (!value.status) errors.status = "Enter a bill status.";
  return { value, errors };
}

export function total(value: BillInput) { return [value.waterConsumptionAmount, value.previousBalance, value.penaltyAmount, value.connectionFeeAmount, value.adjustmentAmount].reduce((sum, part) => sum + Number(part), 0).toFixed(2); }

export async function validateRelations(client: PoolClient, value: BillInput) {
  const [account, period, reading] = await Promise.all([
    client.query("SELECT service_account_id FROM service_accounts WHERE service_account_id=$1", [value.serviceAccountId]),
    client.query("SELECT billing_period_id FROM mt_billing_period WHERE billing_period_id=$1", [value.billingPeriodId]),
    value.readingId ? client.query("SELECT reading_id FROM meter_readings WHERE reading_id=$1 AND service_account_id=$2 AND billing_period_id=$3", [value.readingId, value.serviceAccountId, value.billingPeriodId]) : Promise.resolve({ rows: [{}] }),
  ]);
  if (!account.rows[0]) throw new Error("INVALID_ACCOUNT");
  if (!period.rows[0]) throw new Error("INVALID_PERIOD");
  if (!reading.rows[0]) throw new Error("INVALID_READING");
}

export async function nextBillNo(client: PoolClient, userId: string) {
  const result = await client.query<{ series_id: string; prefix: string | null; current_number: string; padding_length: number }>("SELECT series_id, prefix, current_number, padding_length FROM mt_document_series WHERE UPPER(document_type)='BILL' AND is_active=TRUE ORDER BY series_id FOR UPDATE LIMIT 1");
  const series = result.rows[0];
  if (!series) throw new Error("BILL_SERIES_NOT_CONFIGURED");
  const next = BigInt(series.current_number) + BigInt(1);
  await client.query("UPDATE mt_document_series SET current_number=$1, updated_by=$2, updated_at=NOW() WHERE series_id=$3", [next.toString(), userId, series.series_id]);
  return `${series.prefix || "BILL-"}${next.toString().padStart(series.padding_length || 5, "0")}`;
}

export function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  const map: Record<string, [string, number]> = { INVALID_ACCOUNT: ["The selected service account was not found.", 400], INVALID_PERIOD: ["The selected billing period was not found.", 400], INVALID_READING: ["The meter reading must belong to the selected service account and billing period.", 400], BILL_SERIES_NOT_CONFIGURED: ["An active BILL document series must be configured before bills can be created.", 409] };
  if (map[code]) return map[code];
  if (typeof error === "object" && error && "code" in error && error.code === "23505") return ["The generated bill number already exists. Please try again.", 409] as [string, number];
  return null;
}
