import { Pool } from "pg";

export const runtime = "nodejs";
const globalForDb = globalThis as unknown as { userPool?: Pool };
const pool = globalForDb.userPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForDb.userPool = pool;

function maskMeterNumber(value: string | null) {
  if (!value) return null;
  if (value.length <= 4) return value;
  return `${"•".repeat(Math.min(value.length - 4, 6))}${value.slice(-4)}`;
}

type BillingRow = { control_no: string; connection_status: string | null; meter_no: string | null; bill_no: string | null; bill_date: Date | null; due_date: Date | null; total_amount_due: string | null; bill_status: string | null; period_name: string | null; period_code: string | null; previous_reading: string | null; present_reading: string | null; consumption: string | null };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accountNumber = typeof body.accountNumber === "string" ? body.accountNumber.trim() : "";
    if (!accountNumber || accountNumber.length < 3 || accountNumber.length > 50 || !/^[A-Za-z0-9-]+$/.test(accountNumber)) return Response.json({ message: "Enter a valid account number." }, { status: 400 });
    const result = await pool.query<BillingRow>(`
      SELECT sa.control_no, cs.status_name AS connection_status, meter.meter_no,
             bill.bill_no, bill.bill_date, bill.due_date, bill.total_amount_due,
             bill.status AS bill_status, period.period_name, period.period_code,
             reading.previous_reading, reading.present_reading, reading.consumption
        FROM service_accounts sa
        LEFT JOIN mt_connection_status cs ON cs.connection_status_id = sa.connection_status_id
        LEFT JOIN LATERAL (SELECT m.meter_no FROM meters m WHERE m.service_account_id = sa.service_account_id ORDER BY (m.status = 'ACTIVE') DESC, m.meter_id DESC LIMIT 1) meter ON TRUE
        LEFT JOIN LATERAL (SELECT b.* FROM bills b WHERE b.service_account_id = sa.service_account_id ORDER BY b.bill_date DESC, b.bill_id DESC LIMIT 1) bill ON TRUE
        LEFT JOIN mt_billing_period period ON period.billing_period_id = bill.billing_period_id
        LEFT JOIN meter_readings reading ON reading.reading_id = bill.reading_id
       WHERE UPPER(sa.control_no) = UPPER($1) LIMIT 1
    `, [accountNumber]);
    const account = result.rows[0];
    if (!account) return Response.json({ message: "No account was found with that number." }, { status: 404 });
    return Response.json({ accountNo: account.control_no, serviceStatus: account.connection_status || "Not available", meterNo: maskMeterNumber(account.meter_no), bill: account.bill_no ? { billNo: account.bill_no, billDate: account.bill_date, dueDate: account.due_date, amountDue: account.total_amount_due || "0", status: account.bill_status || "UNKNOWN", period: account.period_name || account.period_code || "Not available", previousReading: account.previous_reading, presentReading: account.present_reading, consumption: account.consumption } : null });
  } catch (error) {
    console.error("Billing inquiry failed:", error);
    return Response.json({ message: "Billing inquiry is temporarily unavailable." }, { status: 500 });
  }
}
