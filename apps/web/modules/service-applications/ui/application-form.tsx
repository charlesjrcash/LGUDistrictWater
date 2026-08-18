"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomerSummary, ReferenceOption, ServiceApplicationDetail } from "@/modules/service-applications/types";
import { ModuleShell } from "./module-shell";
import styles from "./service-applications.module.css";

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function CustomerCard({ customer }: { customer: CustomerSummary }) {
  const fields = [["Customer Name", customer.name], ["Customer No.", customer.customerNo], ["Address", customer.address || "—"], ["Barangay", customer.barangay || "—"], ["Contact No.", customer.contactNo || "—"], ["Current Status", customer.status]];
  return <div className={styles.customerCard}>{fields.map(([label, value]) => <div className={styles.customerCardItem} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}

export function ApplicationForm({ applicationNo, initialCustomerNo }: { applicationNo?: string; initialCustomerNo?: string }) {
  const router = useRouter();
  const editing = Boolean(applicationNo);
  const [types, setTypes] = useState<ReferenceOption[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerSummary[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);
  const [applicationTypeCode, setApplicationTypeCode] = useState("");
  const [applicationDate, setApplicationDate] = useState(localDate);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(editing);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const requests: Promise<Response>[] = [fetch("/api/service-applications/options")];
        if (applicationNo) requests.push(fetch(`/api/service-applications/${encodeURIComponent(applicationNo)}`, { cache: "no-store" }));
        const responses = await Promise.all(requests);
        const optionBody = await responses[0].json();
        if (!responses[0].ok) throw new Error(optionBody.message);
        if (!cancelled) setTypes(optionBody.data.types);
        if (responses[1]) {
          const detailBody = await responses[1].json();
          if (!responses[1].ok) throw new Error(detailBody.message);
          const detail = detailBody.data as ServiceApplicationDetail;
          if (!cancelled) {
            setSelectedCustomer(detail.customer);
            setApplicationTypeCode(detail.applicationTypeCode);
            setApplicationDate(detail.applicationDate);
            setRemarks(detail.remarks || "");
          }
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load the form.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [applicationNo]);

  useEffect(() => {
    if (editing || !initialCustomerNo) return;
    const customerToSelect = initialCustomerNo;
    let cancelled = false;
    async function selectInitialCustomer() {
      try {
        const response = await fetch(`/api/service-applications/customers?q=${encodeURIComponent(customerToSelect)}`);
        const body = await response.json();
        if (!response.ok) throw new Error(body.message);
        const match = (body.data as CustomerSummary[]).find((customer) => customer.customerNo === customerToSelect);
        if (!cancelled && match) setSelectedCustomer(match);
        if (!cancelled && !match) setError("The newly selected customer could not be found.");
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to select the customer.");
      }
    }
    void selectInitialCustomer();
    return () => { cancelled = true; };
  }, [editing, initialCustomerNo]);

  useEffect(() => {
    if (editing || customerQuery.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/service-applications/customers?q=${encodeURIComponent(customerQuery.trim())}`, { signal: controller.signal });
        const body = await response.json();
        if (response.ok) setCustomerResults(body.data);
      } catch (searchError) {
        if (!(searchError instanceof DOMException && searchError.name === "AbortError")) setCustomerResults([]);
      } finally { setSearching(false); }
    }, 280);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [customerQuery, editing]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const errors: Record<string, string> = {};
    if (!editing && !selectedCustomer) errors.customerNo = "Select a customer.";
    if (!applicationTypeCode) errors.applicationTypeCode = "Select an application type.";
    if (!applicationDate) errors.applicationDate = "Enter an application date.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(editing ? `/api/service-applications/${encodeURIComponent(applicationNo!)}` : "/api/service-applications", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerNo: selectedCustomer?.customerNo, applicationTypeCode, applicationDate, remarks }),
      });
      const body = await response.json();
      if (!response.ok) {
        setFieldErrors(body.errors || {});
        throw new Error(body.message || "Unable to save the application.");
      }
      const destination = editing ? applicationNo! : body.data.applicationNo;
      router.push(`/service-applications/${encodeURIComponent(destination)}?${editing ? "updated" : "created"}=1`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save the application.");
      setSubmitting(false);
    }
  }

  return (
    <ModuleShell>
      <div className={styles.formShell}>
        <Link href={editing && applicationNo ? `/service-applications/${encodeURIComponent(applicationNo)}` : "/service-applications"} className={styles.backLink}>← {editing ? applicationNo : "Service Applications"}</Link>
        <div className={styles.headingRow}><div><div className={styles.eyebrow}>Service Applications</div><h1 className={styles.title}>{editing ? "Edit Service Application" : "New Service Application"}</h1><p className={styles.subtitle}>{editing ? "Update the editable application information." : "Create a water service application for an existing customer."}</p></div></div>
        <form className={`${styles.panel} ${styles.formPanel}`} onSubmit={handleSubmit} noValidate>
          {error && <div className={styles.notice} role="alert">{error}</div>}
          {loading ? <div className={styles.loading}><div className={styles.skeleton} style={{ height: 24, marginBottom: 18 }} /><div className={styles.skeleton} style={{ height: 130 }} /></div> : <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Customer</h2><p className={styles.sectionDescription}>Select an existing customer record for this application.</p>
              {!editing && !selectedCustomer && <div className={styles.fullField}><label className={styles.label} htmlFor="customer-search">Search customer <span className={styles.required}>*</span></label><div className={styles.searchWrap}><svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg><input id="customer-search" className={styles.input} value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Search by customer name, number, or contact number..." autoComplete="off" /></div>{fieldErrors.customerNo && <div className={styles.fieldError}>{fieldErrors.customerNo}</div>}{customerQuery.trim().length >= 2 && <div className={styles.customerResults}>{searching ? <div className={styles.loading} style={{ padding: 18 }}>Searching customers…</div> : customerResults.length ? customerResults.map((customer) => <button key={customer.customerNo} type="button" className={styles.customerResult} onClick={() => { setSelectedCustomer(customer); setCustomerResults([]); setCustomerQuery(""); }}><span><strong className={styles.strong}>{customer.name}</strong><span className={styles.muted}>{customer.customerNo} · {customer.barangay || customer.address || "Address not available"}</span></span><span className={styles.muted}>{customer.contactNo || "No contact"}</span></button>) : <div className={styles.loading} style={{ padding: 18 }}>No customers match your search.</div>}</div>}<p className={styles.muted}>Customer not listed? <Link href="/customers/new?returnTo=/service-applications/new" className={styles.viewLink}>＋ Add New Customer</Link></p></div>}
              {selectedCustomer && <><CustomerCard customer={selectedCustomer} />{!editing && <div style={{ marginTop: 12 }}><button type="button" className={styles.ghostButton} onClick={() => setSelectedCustomer(null)}>Change customer</button></div>}</>}
            </section>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Application Information</h2><p className={styles.sectionDescription}>Application number and initial status are assigned automatically.</p>
              <div className={styles.fieldGrid}>
                <div><label className={styles.label} htmlFor="application-type">Application Type <span className={styles.required}>*</span></label><select id="application-type" className={styles.select} value={applicationTypeCode} onChange={(event) => setApplicationTypeCode(event.target.value)}><option value="">Select application type</option>{types.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select>{fieldErrors.applicationTypeCode && <div className={styles.fieldError}>{fieldErrors.applicationTypeCode}</div>}</div>
                <div><label className={styles.label} htmlFor="application-date">Application Date <span className={styles.required}>*</span></label><input id="application-date" className={styles.input} type="date" value={applicationDate} onChange={(event) => setApplicationDate(event.target.value)} />{fieldErrors.applicationDate && <div className={styles.fieldError}>{fieldErrors.applicationDate}</div>}</div>
                <div className={styles.fullField}><label className={styles.label} htmlFor="remarks">Notes / Remarks</label><textarea id="remarks" className={styles.textarea} value={remarks} onChange={(event) => setRemarks(event.target.value)} maxLength={4000} placeholder="Optional notes about this application" /></div>
              </div>
            </section>
            <div className={styles.formActions}><Link href={editing && applicationNo ? `/service-applications/${encodeURIComponent(applicationNo)}` : "/service-applications"} className={styles.secondaryButton}>Cancel</Link><button className={styles.button} disabled={submitting}>{submitting ? "Saving…" : editing ? "Save Changes" : "Save Application"}</button></div>
          </>}
        </form>
      </div>
    </ModuleShell>
  );
}
