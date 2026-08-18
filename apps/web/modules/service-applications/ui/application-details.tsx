"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ServiceApplicationDetail } from "@/modules/service-applications/types";
import { classifyStatus } from "@/modules/service-applications/server";
import { ApplicationStatusBadge } from "./application-status-badge";
import { ModuleShell } from "./module-shell";
import styles from "./service-applications.module.css";

type WorkflowAction = "approve" | "reject";

function formatDate(value: string, long = false) {
  return new Intl.DateTimeFormat("en-PH", { month: long ? "long" : "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

export function ApplicationDetails({ applicationNo }: { applicationNo: string }) {
  const [application, setApplication] = useState<ServiceApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmAction, setConfirmAction] = useState<WorkflowAction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/service-applications/${encodeURIComponent(applicationNo)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to load the application.");
      setApplication(body.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the application.");
    } finally { setLoading(false); }
  }, [applicationNo]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
      const params = new URLSearchParams(window.location.search);
      if (params.has("created")) setNotice(`Service application ${applicationNo} was created successfully.`);
      if (params.has("updated")) setNotice(`Application ${applicationNo} was updated successfully.`);
      if (params.has("created") || params.has("updated")) window.history.replaceState({}, "", window.location.pathname);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [applicationNo, load]);

  async function changeStatus() {
    if (!confirmAction || submitting) return;
    setSubmitting(true); setError("");
    try {
      const response = await fetch(`/api/service-applications/${encodeURIComponent(applicationNo)}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: confirmAction }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to update the application.");
      setNotice(body.message);
      setConfirmAction(null);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update the application.");
    } finally { setSubmitting(false); }
  }

  if (loading) return <ModuleShell><Link href="/service-applications" className={styles.backLink}>← Service Applications</Link><div className={styles.panel}><div className={styles.loading}><div className={styles.skeleton} style={{ height: 34, width: "35%", marginBottom: 22 }} /><div className={styles.skeleton} style={{ height: 180 }} /></div></div></ModuleShell>;
  if (error && !application) return <ModuleShell><Link href="/service-applications" className={styles.backLink}>← Service Applications</Link><div className={`${styles.panel} ${styles.errorState}`}><h2>Application unavailable</h2><p>{error}</p><button className={styles.secondaryButton} onClick={load}>Try again</button></div></ModuleShell>;
  if (!application) return null;

  const statusKind = classifyStatus(application.statusCode, application.status);
  const currentIndex = Math.max(0, application.statuses.findIndex((status) => status.code === application.statusCode));
  const applicantFields = [["Customer Name", application.customer.name], ["Customer No.", application.customer.customerNo], ["Address", application.customer.address || "—"], ["Barangay", application.customer.barangay || "—"], ["Contact Number", application.customer.contactNo || "—"], ["Customer Status", application.customer.status]];
  const applicationFields = [["Application No.", application.applicationNo], ["Application Type", application.applicationType], ["Application Date", formatDate(application.applicationDate, true)], ["Status", application.status]];

  return (
    <ModuleShell>
      <Link href="/service-applications" className={styles.backLink}>← Service Applications</Link>
      {notice && <div className={styles.successNotice} role="status">{notice}</div>}
      {error && <div className={styles.notice} role="alert">{error}</div>}
      <header className={styles.detailHeader}><div><div className={styles.applicationNumber}><h1>{application.applicationNo}</h1><ApplicationStatusBadge code={application.statusCode} name={application.status} /></div><p className={styles.detailCustomer}>{application.customer.name}<span>Customer No. {application.customer.customerNo}</span></p></div>{statusKind === "pending" && <Link href={`/service-applications/${encodeURIComponent(application.applicationNo)}/edit`} className={styles.secondaryButton}>Edit Application</Link>}</header>

      <div className={styles.detailGrid}>
        <div>
          <section className={styles.detailCard}><div className={styles.cardHeading}><h2>Applicant Information</h2><Link href={`/customers/${encodeURIComponent(application.customer.customerNo)}`} className={styles.viewLink}>View Customer Profile →</Link></div><div className={styles.detailItems}>{applicantFields.map(([label, value]) => <div className={styles.detailItem} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>
          <section className={styles.detailCard}><div className={styles.cardHeading}><h2>Application Information</h2></div><div className={styles.detailItems}>{applicationFields.map(([label, value]) => <div className={styles.detailItem} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>{application.remarks && <><div style={{ borderTop: "1px solid #e5ebf2", margin: "20px 0" }} /><div className={styles.detailItem}><span>Notes / Remarks</span><div className={styles.remarks}>{application.remarks}</div></div></>}</section>
        </div>
        <aside>
          <section className={styles.detailCard}><div className={styles.cardHeading}><h2>Application Progress</h2></div><div className={styles.progress}>{application.statuses.map((status, index) => { const current = status.code === application.statusCode; const done = statusKind !== "rejected" && index < currentIndex; return <div key={status.code} className={`${styles.progressItem} ${current ? styles.progressCurrent : done ? styles.progressDone : ""}`}><span className={styles.progressDot} /><div><div className={styles.progressName}>{status.name}</div>{status.description && <div className={styles.progressDescription}>{status.description}</div>}</div></div>; })}</div></section>
          <section className={styles.detailCard}><div className={styles.cardHeading}><h2>Application Actions</h2></div><div className={styles.actionStack}>{statusKind === "pending" && <><Link href={`/service-applications/${encodeURIComponent(application.applicationNo)}/edit`} className={styles.secondaryButton}>Edit Application</Link><button className={styles.dangerButton} onClick={() => setConfirmAction("reject")}>Reject</button><button className={styles.button} onClick={() => setConfirmAction("approve")}>Approve Application</button></>}{statusKind === "approved" && <><div className={styles.successNotice} style={{ margin: 0 }}>This application is approved and ready for the next step.</div>{application.serviceAccountControlNo ? <Link className={styles.button} href={`/service-accounts/${encodeURIComponent(application.serviceAccountControlNo)}`}>View Service Account</Link> : <Link className={styles.button} href={`/service-accounts/new?application=${encodeURIComponent(application.applicationNo)}`}>Create Service Account</Link>}</>}{statusKind === "rejected" && <div className={styles.notice} style={{ margin: 0 }}>This application has been rejected. No further workflow actions are available.</div>}{!["pending", "approved", "rejected"].includes(statusKind) && <div className={styles.muted}>No actions are available for the current status.</div>}</div></section>
        </aside>
      </div>

      {confirmAction && <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setConfirmAction(null); }}><div className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"><h2 id="confirm-title">{confirmAction === "approve" ? "Approve Application?" : "Reject Application?"}</h2><p>{application.applicationNo} for {application.customer.name} will be marked as {confirmAction === "approve" ? "approved" : "rejected"}. This action cannot be submitted twice.</p><div className={styles.dialogActions}><button className={styles.ghostButton} disabled={submitting} onClick={() => setConfirmAction(null)}>Cancel</button><button className={confirmAction === "approve" ? styles.button : styles.dangerButton} disabled={submitting} onClick={changeStatus}>{submitting ? "Updating…" : confirmAction === "approve" ? "Approve" : "Reject"}</button></div></div></div>}
    </ModuleShell>
  );
}
