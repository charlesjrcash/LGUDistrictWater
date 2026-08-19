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

export type WaterCharge = { rateId: string; description: string | null; quantity: string; rate: string; amount: string; sequenceNo: number };

/** Resolves and snapshots the progressive water charges for a linked reading. */
export async function calculateWaterCharges(client: PoolClient, value: BillInput) {
  if (!value.readingId) return { waterConsumptionAmount: "0.00", charges: [] as WaterCharge[] };
  const reading = await client.query<{ consumption: string; classification_id: string; meter_size_id: string }>(`SELECT rd.consumption::text AS consumption, sa.classification_id::text, m.meter_size_id::text FROM meter_readings rd INNER JOIN service_accounts sa ON sa.service_account_id=rd.service_account_id INNER JOIN meters m ON m.meter_id=rd.meter_id WHERE rd.reading_id=$1 AND rd.service_account_id=$2 AND rd.billing_period_id=$3`, [value.readingId, value.serviceAccountId, value.billingPeriodId]);
  if (!reading.rows[0]) throw new Error("INVALID_READING");
  const consumption = Number(reading.rows[0].consumption);
  if (!Number.isFinite(consumption) || consumption < 0) throw new Error("INVALID_CONSUMPTION");
  if (consumption === 0) return { waterConsumptionAmount: "0.00", charges: [] as WaterCharge[] };
  const rates = await client.query<{ rate_id: string; minimum_cubic_meter: string; maximum_cubic_meter: string | null; rate_type: string; rate_amount: string; description: string | null }>(`SELECT rate_id::text, minimum_cubic_meter::text, maximum_cubic_meter::text, rate_type, rate_amount::text, description FROM mt_water_rates WHERE classification_id=$1 AND meter_size_id=$2 AND is_active=TRUE AND effective_date <= $3::date AND (expiration_date IS NULL OR expiration_date >= $3::date) ORDER BY minimum_cubic_meter, rate_id`, [reading.rows[0].classification_id, reading.rows[0].meter_size_id, value.billDate]);
  if (!rates.rows.length) throw new Error("NO_APPLICABLE_RATE");
  const charges: WaterCharge[] = [];
  for (const rate of rates.rows) {
    if (rate.rate_type !== "PER_CU_M") throw new Error("UNSUPPORTED_RATE_TYPE");
    const lower = Number(rate.minimum_cubic_meter), upper = rate.maximum_cubic_meter === null ? Infinity : Number(rate.maximum_cubic_meter);
    if (!Number.isFinite(lower) || (!Number.isFinite(upper) && upper !== Infinity) || upper <= lower) throw new Error("INVALID_RATE_TIER");
    const quantity = Math.max(0, Math.min(consumption, upper) - lower);
    if (quantity > 0) { const amount = quantity * Number(rate.rate_amount); charges.push({ rateId: rate.rate_id, description: rate.description, quantity: quantity.toFixed(3), rate: Number(rate.rate_amount).toFixed(4), amount: amount.toFixed(2), sequenceNo: charges.length + 1 }); }
  }
  if (!charges.length || charges.reduce((sum, item) => sum + Number(item.quantity), 0) + 0.000001 < consumption) throw new Error("INCOMPLETE_RATE_TIERS");
  return { waterConsumptionAmount: charges.reduce((sum, item) => sum + Number(item.amount), 0).toFixed(2), charges };
}

export async function replaceWaterCharges(client: PoolClient, billId: string, charges: WaterCharge[]) {
  await client.query("DELETE FROM bill_details WHERE bill_id=$1 AND charge_type='WATER_CONSUMPTION'", [billId]);
  for (const charge of charges) await client.query("INSERT INTO bill_details(bill_id,charge_type,rate_id,description,quantity,rate,amount,sequence_no) VALUES($1,'WATER_CONSUMPTION',$2,$3,$4,$5,$6,$7)", [billId, charge.rateId, charge.description, charge.quantity, charge.rate, charge.amount, charge.sequenceNo]);
}

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
  const map: Record<string, [string, number]> = { INVALID_ACCOUNT: ["The selected service account was not found.", 400], INVALID_PERIOD: ["The selected billing period was not found.", 400], INVALID_READING: ["The meter reading must belong to the selected service account and billing period.", 400], INVALID_CONSUMPTION: ["The linked meter reading has an invalid consumption value.", 400], NO_APPLICABLE_RATE: ["No active water rate applies to this account, meter size, and bill date.", 409], UNSUPPORTED_RATE_TYPE: ["An applicable water rate uses an unsupported rate type.", 409], INVALID_RATE_TIER: ["An applicable water rate tier is invalid.", 409], INCOMPLETE_RATE_TIERS: ["The configured water rate tiers do not cover the reading consumption.", 409], BILL_SERIES_NOT_CONFIGURED: ["An active BILL document series must be configured before bills can be created.", 409] };
  if (map[code]) return map[code];
  if (typeof error === "object" && error && "code" in error && error.code === "23505") return ["The generated bill number already exists. Please try again.", 409] as [string, number];
  return null;
}
