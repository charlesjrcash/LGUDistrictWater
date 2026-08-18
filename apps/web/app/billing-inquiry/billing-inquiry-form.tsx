"use client";

import { FormEvent, useState } from "react";
import styles from "./billing-inquiry.module.css";
import resultStyles from "./billing-results.module.css";

type Bill = { billNo: string; billDate: string | null; dueDate: string | null; amountDue: string; status: string; period: string; previousReading: string | null; presentReading: string | null; consumption: string | null };
type Result = { customerNo: string; accountNo: string; serviceStatus: string; meterNo: string | null; bill: Bill | null };
function date(value: string | null) { return value ? new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Manila" }).format(new Date(value)) : "Not available"; }
function money(value: string) { return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value)); }

export default function BillingInquiryForm() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setMessage(null); setResult(null);
    try {
      const accountNumber = String(new FormData(event.currentTarget).get("accountNumber") || "").trim();
      const response = await fetch("/api/billing-inquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountNumber }) });
      const data = (await response.json()) as Result & { message?: string };
      if (!response.ok) throw new Error(data.message || "Unable to find that account.");
      setResult(data);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to search right now."); }
    finally { setSubmitting(false); }
  }
  return <section className={styles.card}><div className={styles.cardHead}><div className={styles.icon}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg></div><div><h2>Account search</h2><p>Enter an exact customer or service account number.</p></div></div><form onSubmit={handleSubmit}><label htmlFor="accountNumber">Customer or account number</label><div className={styles.searchRow}><input id="accountNumber" name="accountNumber" required minLength={3} maxLength={50} autoComplete="off" placeholder="Example: CUS-00003" aria-describedby="accountHint"/><button type="submit" disabled={submitting}>{submitting ? "Searching…" : "Search billing information"}<span>→</span></button></div></form>{message && <p className={styles.error} role="alert">{message}</p>}{result && <div className={resultStyles.billResult} aria-live="polite"><div className={resultStyles.accountBar}><span><small>Customer number</small><b>{result.customerNo}</b></span><span><small>Service account</small><b>{result.accountNo}</b></span><span><small>Service status</small><b>{result.serviceStatus}</b></span><span><small>Meter number</small><b>{result.meterNo || "Not available"}</b></span></div>{result.bill ? <><div className={resultStyles.billHero}><div><small>Latest amount due</small><strong>{money(result.bill.amountDue)}</strong><span className={`${resultStyles.billStatus} ${result.bill.status === "PAID" ? resultStyles.paid : ""}`}>{result.bill.status}</span></div><div><small>Due date</small><b>{date(result.bill.dueDate)}</b><small>Billing period</small><b>{result.bill.period}</b></div></div><div className={resultStyles.billDetails}><div><small>Bill number</small><b>{result.bill.billNo}</b></div><div><small>Bill date</small><b>{date(result.bill.billDate)}</b></div><div><small>Previous reading</small><b>{result.bill.previousReading ? `${result.bill.previousReading} m³` : "—"}</b></div><div><small>Present reading</small><b>{result.bill.presentReading ? `${result.bill.presentReading} m³` : "—"}</b></div><div><small>Consumption</small><b>{result.bill.consumption ? `${result.bill.consumption} m³` : "—"}</b></div></div></> : <p className={resultStyles.noBill}>The service account exists, but it does not have a generated bill yet.</p>}</div>}</section>;
}
