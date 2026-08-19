"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { classifyStatus } from "@/modules/service-applications/server";
import type { ServiceApplicationDetail } from "@/modules/service-applications/types";
import { ApplicationStatusBadge } from "./application-status-badge";
import { ModuleShell } from "./module-shell";
import styles from "./service-applications.module.css";

type WorkflowAction = "inspect" | "approve" | "reject" | "complete";

const actionLabels: Record<WorkflowAction, string> = {
  inspect: "Send for Inspection",
  approve: "Approve Application",
  reject: "Reject Application",
  complete: "Complete Application",
};

function formatDate(value: string, long = false) {
  return new Intl.DateTimeFormat("en-PH", { month: long ? "long" : "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

function DetailItems({ items }: { items: [string, string][] }) {
  return <div className={styles.detailItems}>{items.map(([label, value]) => <div className={styles.detailItem} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}

export function ApplicationDetails({ applicationNo }: { applicationNo: string }) {
  const [application, setApplication] = useState<ServiceApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmAction, setConfirmAction] = useState<WorkflowAction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/service-applications/${encodeURIComponent(applicationNo)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to load the application.");
      setApplication(body.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the application.");
    } finally {
      setLoading(false);
    }
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
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/service-applications/${encodeURIComponent(applicationNo)}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: confirmAction }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to update the application.");
      setNotice(body.message);
      setConfirmAction(null);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update the application.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <ModuleShell><Link href="/transactions/service-applications" className={styles.backLink}>← Service Applications</Link><div className={styles.panel}><div className={styles.loading}><div className={styles.skeleton} style={{ height: 34, width: "35%", marginBottom: 22 }} /><div className={styles.skeleton} style={{ height: 180 }} /></div></div></ModuleShell>;
  if (error && !application) return <ModuleShell><Link href="/transactions/service-applications" className={styles.backLink}>← Service Applications</Link><div className={`${styles.panel} ${styles.errorState}`}><h2>Application unavailable</h2><p>{error}</p><button className={styles.secondaryButton} onClick={load}>Try again</button></div></ModuleShell>;
  if (!application) return null;

  const statusKind = classifyStatus(application.statusCode, application.status);
  const currentIndex = Math.max(0, application.statuses.findIndex((status) => status.code === application.statusCode));
  const applicantFields: [string, string][] = [["Customer Name", application.customer.name], ["Customer No.", application.customer.customerNo], ["Address", application.customer.address || "—"], ["Barangay", application.customer.barangay || "—"], ["Contact Number", application.customer.contactNo || "—"], ["Customer Status", application.customer.status]];
  const applicationFields: [string, string][] = [["Application No.", application.applicationNo], ["Application Type", application.applicationType], ["Application Date", formatDate(application.applicationDate, true)], ["Status", application.status], ["Connection Type", application.connectionType || "—"], ["Requested Meter Size", application.requestedMeterSize || "—"], ["Service Account", application.serviceAccountControlNo ? "Service Account Created" : "No Service Account Yet"], ["Created", formatDate(application.createdAt, true)], ["Last Updated", application.updatedAt ? formatDate(application.updatedAt, true) : "—"]];

  return <ModuleShell>
    <Link href="/transactions/service-applications" className={styles.backLink}>← Service Applications</Link>
    {notice && <div className={styles.successNotice} role="status">{notice}</div>}
    {error && <div className={styles.notice} role="alert">{error}</div>}
    <header className={styles.detailHeader}><div><div className={styles.applicationNumber}><h1>{application.applicationNo}</h1><ApplicationStatusBadge code={application.statusCode} name={application.status} /></div><p className={styles.detailCustomer}>{application.customer.name}<span>Customer No. {application.customer.customerNo}</span></p></div>{statusKind === "pending" && <Link href={`/transactions/service-applications/${encodeURIComponent(application.applicationNo)}/edit`} className={styles.secondaryButton}>Edit Application</Link>}</header>
    <div className={styles.detailGrid}>
      <div>
        <section className={styles.detailCard}><div className={styles.cardHeading}><h2>Applicant Information</h2><Link href={`/transactions/customers/${encodeURIComponent(application.customer.customerNo)}`} className={styles.viewLink}>View Customer Profile →</Link></div><DetailItems items={applicantFields} /></section>
        <section className={styles.detailCard}><div className={styles.cardHeading}><h2>Application Information</h2></div><DetailItems items={applicationFields} />{application.remarks && <><div style={{ borderTop: "1px solid #e5ebf2", margin: "20px 0" }} /><div className={styles.detailItem}><span>Notes / Remarks</span><div className={styles.remarks}>{application.remarks}</div></div></>}</section>
        <section className={styles.detailCard}><div className={styles.cardHeading}><h2>Investigation</h2></div><DetailItems items={[["Investigation Date", application.investigationDate ? formatDate(application.investigationDate, true) : "—"], ["Investigation Result", application.investigationResult || "—"]]} /></section>
        <section className={styles.detailCard}><div className={styles.cardHeading}><h2>Inspection</h2></div><DetailItems items={[["Inspection Date", application.inspectionDate ? formatDate(application.inspectionDate, true) : "—"], ["Inspection Result", application.inspectionResult || "—"]]} /></section>
      </div>
      <aside>
        <section className={styles.detailCard}><div className={styles.cardHeading}><h2>Application Progress</h2></div><div className={styles.progress}>{application.statuses.map((status, index) => { const current = status.code === application.statusCode; const done = statusKind !== "rejected" && index < currentIndex; return <div key={status.code} className={`${styles.progressItem} ${current ? styles.progressCurrent : done ? styles.progressDone : ""}`}><span className={styles.progressDot} /><div><div className={styles.progressName}>{status.name}</div>{status.description && <div className={styles.progressDescription}>{status.description}</div>}</div></div>; })}</div></section>
        <section className={styles.detailCard}><div className={styles.cardHeading}><h2>Application Actions</h2></div><div className={styles.actionStack}>{statusKind === "pending" && <><Link href={`/transactions/service-applications/${encodeURIComponent(application.applicationNo)}/edit`} className={styles.secondaryButton}>Edit Application</Link><button className={styles.dangerButton} onClick={() => setConfirmAction("reject")}>Reject</button><button className={styles.button} onClick={() => setConfirmAction("inspect")}>Send for Inspection</button></>}{statusKind === "processing" && <><button className={styles.dangerButton} onClick={() => setConfirmAction("reject")}>Reject</button><button className={styles.button} onClick={() => setConfirmAction("approve")}>Approve Application</button></>}{statusKind === "approved" && <><div className={styles.successNotice} style={{ margin: 0 }}>This application is approved and ready for the next step.</div>{application.serviceAccountControlNo ? <Link className={styles.button} href={`/transactions/service-accounts/${encodeURIComponent(application.serviceAccountControlNo)}`}>Service Account Created</Link> : <Link className={styles.button} href={`/transactions/service-accounts/new?application=${encodeURIComponent(application.applicationNo)}`}>Create Service Account</Link>}<button className={styles.secondaryButton} onClick={() => setConfirmAction("complete")}>Complete Application</button></>}{statusKind === "rejected" && <div className={styles.notice} style={{ margin: 0 }}>This application has been rejected. No further workflow actions are available.</div>}{!["pending", "processing", "approved", "rejected"].includes(statusKind) && <div className={styles.muted}>{application.serviceAccountControlNo ? "Service Account Created" : "No Service Account Yet"}</div>}</div></section>
      </aside>
    </div>
    {confirmAction && <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setConfirmAction(null); }}><div className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"><h2 id="confirm-title">{actionLabels[confirmAction]}?</h2><p>{application.applicationNo} for {application.customer.name} will be moved to the next workflow status.</p><div className={styles.dialogActions}><button className={styles.ghostButton} disabled={submitting} onClick={() => setConfirmAction(null)}>Cancel</button><button className={confirmAction === "reject" ? styles.dangerButton : styles.button} disabled={submitting} onClick={changeStatus}>{submitting ? "Updating…" : actionLabels[confirmAction]}</button></div></div></div>}
  </ModuleShell>;
}
