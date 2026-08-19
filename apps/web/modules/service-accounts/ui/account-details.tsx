"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ServiceAccountDetail } from "@/modules/service-accounts/types";
import { classifyAccountStatus } from "@/modules/service-accounts/server";
import { TransactionShell } from "@/modules/transactions/ui/transaction-shell";
import styles from "@/modules/transactions/ui/transactions.module.css";
import { AccountStatusBadge } from "./account-status-badge";

function formatDate(value: string | null, long = false) {
  if (!value) return "Not yet connected";
  return new Intl.DateTimeFormat("en-PH", {
    month: long ? "long" : "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

export function AccountDetails({ controlNo, canEdit }: { controlNo: string; canEdit: boolean }) {
  const [account, setAccount] = useState<ServiceAccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/service-accounts/${encodeURIComponent(controlNo)}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setAccount(body.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load the service account.",
      );
    } finally {
      setLoading(false);
    }
  }, [controlNo]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
      const params = new URLSearchParams(window.location.search);
      if (params.has("created"))
        setNotice(`Service account ${controlNo} was created successfully.`);
      if (params.has("updated"))
        setNotice(`Service account ${controlNo} was updated successfully.`);
      if (params.has("created") || params.has("updated"))
        window.history.replaceState({}, "", window.location.pathname);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [controlNo, load]);

  if (loading)
    return (
      <TransactionShell active="service-accounts">
        <div className={`${styles.panel} ${styles.loading}`}>
          <div className={styles.skeleton} style={{ height: 220 }} />
        </div>
      </TransactionShell>
    );
  if (!account)
    return (
      <TransactionShell active="service-accounts">
        <Link className={styles.backLink} href="/transactions/service-accounts">
          ← Service Accounts
        </Link>
        <div className={`${styles.panel} ${styles.errorState}`}>
          <h2>Service account unavailable</h2>
          <p>{error}</p>
          <button className={styles.secondaryButton} onClick={load}>
            Try again
          </button>
        </div>
      </TransactionShell>
    );
  const statusKind = classifyAccountStatus(account.statusCode, account.status);
<<<<<<< HEAD
  const customerFields = [["Customer Name",account.customer.name],["Customer No.",account.customer.customerNo],["Address",account.customer.address || "—"],["Barangay",account.customer.barangay || "—"],["Contact Number",account.customer.contactNo || "—"]];
  const accountFields = [["Control No.",account.controlNo],["Classification",account.classification],["Connection Type",account.connectionType],["Connection Status",account.status],["Service Type",account.serviceType || "â€”"],["Reading Route",account.readingRoute || "â€”"],["Date Connected",formatDate(account.dateConnected,true)],["Service Address",account.serviceAddress || "â€”"],["Created At",formatDate(account.createdAt,true)],["Updated At",account.updatedAt ? formatDate(account.updatedAt,true) : "â€”"]];
  return <ModuleShell active="service-accounts">
    <Link className={styles.backLink} href="/service-accounts">← Service Accounts</Link>{notice && <div className={styles.successNotice}>{notice}</div>}{error && <div className={styles.notice}>{error}</div>}
    <header className={styles.detailHeader}><div><div className={styles.applicationNumber}><h1>{account.controlNo}</h1><AccountStatusBadge code={account.statusCode} name={account.status} /></div><p className={styles.detailCustomer}>{account.customer.name}<span>Customer No. {account.customer.customerNo}</span></p></div>{canEdit && <Link className={styles.secondaryButton} href={`/service-accounts/${encodeURIComponent(account.controlNo)}/edit`}>Edit Service Account</Link>}</header>
    <div className={styles.panel} style={{ marginBottom: 18, padding: "0 20px" }}><div style={{ display: "flex", gap: 24, overflowX: "auto" }}><span style={{ padding: "15px 2px 12px", borderBottom: "3px solid #0874e8", color: "#075fc5", fontWeight: 750 }}>Overview</span>{["Meter","Billing","Payments","History"].map((tab) => <span key={tab} title="Available in a future module" style={{ padding: "15px 2px", color: "#9aa7b8", whiteSpace: "nowrap" }}>{tab}</span>)}</div></div>
    <div className={styles.detailGrid}><div>
      <section className={styles.detailCard}><div className={styles.cardHeading}><h2>Customer Information</h2><Link className={styles.viewLink} href={`/customers/${encodeURIComponent(account.customer.customerNo)}`}>View Customer Profile →</Link></div><div className={styles.detailItems}>{customerFields.map(([label,value]) => <div className={styles.detailItem} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>
      <section className={styles.detailCard}><div className={styles.cardHeading}><h2>Service Account Information</h2></div><div className={styles.detailItems}>{accountFields.map(([label,value]) => <div className={styles.detailItem} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>
      {account.application && <section className={styles.detailCard}><div className={styles.cardHeading}><h2>Application Reference</h2><Link className={styles.viewLink} href={`/service-applications/${encodeURIComponent(account.application.applicationNo)}`}>View Application →</Link></div><div className={styles.detailItems}>{[["Application No.",account.application.applicationNo],["Application Type",account.application.applicationType],["Application Date",formatDate(account.application.applicationDate,true)],["Application Status",account.application.status]].map(([label,value]) => <div className={styles.detailItem} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>}
    </div><aside><section className={styles.detailCard}><div className={styles.cardHeading}><h2>Next Step</h2></div>{statusKind === "pending" ? <div className={styles.actionStack}><p className={styles.sectionDescription}>This account is ready for the Connection Fee and Service Installation workflow.</p><button className={styles.button} disabled title="Installation workflow will be implemented next.">Proceed to Installation · Coming next</button></div> : <p className={styles.sectionDescription}>No installation action is available for the current status.</p>}</section></aside></div>
  </ModuleShell>;
=======
  const customerFields = [
    ["Customer Name", account.customer.name],
    ["Customer No.", account.customer.customerNo],
    ["Address", account.customer.address || "—"],
    ["Barangay", account.customer.barangay || "—"],
    ["Contact Number", account.customer.contactNo || "—"],
  ];
  const accountFields = [
    ["Control No.", account.controlNo],
    ["Classification", account.classification],
    ["Connection Type", account.connectionType],
    ["Status", account.status],
    ["Date Connected", formatDate(account.dateConnected, true)],
  ];
  return (
    <TransactionShell active="service-accounts">
      <Link className={styles.backLink} href="/transactions/service-accounts">
        ← Service Accounts
      </Link>
      {notice && <div className={styles.successNotice}>{notice}</div>}
      {error && <div className={styles.notice}>{error}</div>}
      <header className={styles.detailHeader}>
        <div>
          <div className={styles.applicationNumber}>
            <h1>{account.controlNo}</h1>
            <AccountStatusBadge
              code={account.statusCode}
              name={account.status}
            />
          </div>
          <p className={styles.detailCustomer}>
            {account.customer.name}
            <span>Customer No. {account.customer.customerNo}</span>
          </p>
        </div>
        <Link
          className={styles.secondaryButton}
          href={`/transactions/service-accounts/${encodeURIComponent(account.controlNo)}/edit`}
        >
          Edit Service Account
        </Link>
      </header>
      <div
        className={styles.panel}
        style={{ marginBottom: 18, padding: "0 20px" }}
      >
        <div style={{ display: "flex", gap: 24, overflowX: "auto" }}>
          <span
            style={{
              padding: "15px 2px 12px",
              borderBottom: "3px solid #0874e8",
              color: "#075fc5",
              fontWeight: 750,
            }}
          >
            Overview
          </span>
          {["Meter", "Billing", "Payments", "History"].map((tab) => (
            <span
              key={tab}
              title="Available in a future module"
              style={{
                padding: "15px 2px",
                color: "#9aa7b8",
                whiteSpace: "nowrap",
              }}
            >
              {tab}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.detailGrid}>
        <div>
          <section className={styles.detailCard}>
            <div className={styles.cardHeading}>
              <h2>Customer Information</h2>
              <Link
                className={styles.viewLink}
                href={`/transactions/customers/${encodeURIComponent(account.customer.customerNo)}`}
              >
                View Customer Profile →
              </Link>
            </div>
            <div className={styles.detailItems}>
              {customerFields.map(([label, value]) => (
                <div className={styles.detailItem} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className={styles.detailCard}>
            <div className={styles.cardHeading}>
              <h2>Service Account Information</h2>
            </div>
            <div className={styles.detailItems}>
              {accountFields.map(([label, value]) => (
                <div className={styles.detailItem} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>
          {account.application && (
            <section className={styles.detailCard}>
              <div className={styles.cardHeading}>
                <h2>Application Reference</h2>
                <Link
                  className={styles.viewLink}
                  href={`/transactions/service-applications/${encodeURIComponent(account.application.applicationNo)}`}
                >
                  View Application →
                </Link>
              </div>
              <div className={styles.detailItems}>
                {[
                  ["Application No.", account.application.applicationNo],
                  ["Application Type", account.application.applicationType],
                  [
                    "Application Date",
                    formatDate(account.application.applicationDate, true),
                  ],
                  ["Application Status", account.application.status],
                ].map(([label, value]) => (
                  <div className={styles.detailItem} key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside>
          <section className={styles.detailCard}>
            <div className={styles.cardHeading}>
              <h2>Next Step</h2>
            </div>
            {statusKind === "pending" ? (
              <div className={styles.actionStack}>
                <p className={styles.sectionDescription}>
                  This account is ready for the Connection Fee and Service
                  Installation workflow.
                </p>
                <button
                  className={styles.button}
                  disabled
                  title="Installation workflow will be implemented next."
                >
                  Proceed to Installation · Coming next
                </button>
              </div>
            ) : (
              <p className={styles.sectionDescription}>
                No installation action is available for the current status.
              </p>
            )}
          </section>
        </aside>
      </div>
    </TransactionShell>
  );
>>>>>>> 5e852f8f672f3ffc47731a0574417c82b0b41e8a
}
