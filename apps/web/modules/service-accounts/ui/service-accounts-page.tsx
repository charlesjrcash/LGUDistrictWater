"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import type { ReferenceOption } from "@/modules/service-applications/types";
import type { ServiceAccountRow } from "@/modules/service-accounts/types";
import { TransactionShell } from "@/modules/transactions/ui/transaction-shell";
import styles from "@/modules/transactions/ui/transactions.module.css";
import { AccountStatusBadge } from "./account-status-badge";

type Summary = {
  total: number;
  active: number;
  pending: number;
  disconnected: number;
};
type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function ServiceAccountsPage() {
  const [accounts, setAccounts] = useState<ServiceAccountRow[]>([]);
  const [classifications, setClassifications] = useState<ReferenceOption[]>([]);
  const [connectionTypes, setConnectionTypes] = useState<ReferenceOption[]>([]);
  const [statuses, setStatuses] = useState<ReferenceOption[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    active: 0,
    pending: 0,
    disconnected: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState("");
  const [classification, setClassification] = useState("");
  const [connectionType, setConnectionType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/service-accounts/options")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message);
        setClassifications(body.data.classifications);
        setConnectionTypes(body.data.connectionTypes);
        setStatuses(body.data.statuses);
      })
      .catch(() => setError("Unable to load service account filters."));
  }, []);

  const load = useCallback(
    async (page: number) => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "10",
      });
      if (deferredSearch.trim()) params.set("search", deferredSearch.trim());
      if (status) params.set("status", status);
      if (classification) params.set("classification", classification);
      if (connectionType) params.set("connectionType", connectionType);
      try {
        const response = await fetch(`/api/service-accounts?${params}`, {
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.message || "Unable to load service accounts.");
        setAccounts(body.data);
        setSummary(body.summary);
        setPagination(body.pagination);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load service accounts.",
        );
      } finally {
        setLoading(false);
      }
    },
    [classification, connectionType, deferredSearch, status],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(1), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const hasFilters = Boolean(
    search || status || classification || connectionType,
  );
  const cards = [
    ["Total Accounts", summary.total],
    ["Active", summary.active],
    ["Pending Installation", summary.pending],
    ["Disconnected", summary.disconnected],
  ] as const;

  return (
    <TransactionShell active="service-accounts">
      <div className={styles.headingRow}>
        <div>
          <div className={styles.eyebrow}>Customer Services</div>
          <h1 className={styles.title}>Service Accounts</h1>
          <p className={styles.subtitle}>
            Manage active and pending water service accounts.
          </p>
        </div>
      </div>
      <section className={styles.summaryGrid}>
        {cards.map(([label, value]) => (
          <article className={styles.summaryCard} key={label}>
            <div className={styles.summaryLabel}>{label}</div>
            <div className={styles.summaryValue}>{value.toLocaleString()}</div>
          </article>
        ))}
      </section>
      <section className={styles.panel}>
        <div className={styles.filters}>
          <div className={styles.searchWrap}>
            <svg
              className={styles.searchIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              className={styles.input}
              placeholder="Search control no. or customer..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className={styles.select}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All Statuses</option>
            {statuses.map((item) => (
              <option value={item.code} key={item.code}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={classification}
            onChange={(event) => setClassification(event.target.value)}
          >
            <option value="">All Classifications</option>
            {classifications.map((item) => (
              <option value={item.code} key={item.code}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={connectionType}
            onChange={(event) => setConnectionType(event.target.value)}
          >
            <option value="">All Connection Types</option>
            {connectionTypes.map((item) => (
              <option value={item.code} key={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {[
                    "Control No.",
                    "Customer",
                    "Customer No.",
                    "Classification",
                    "Connection Type",
                    "Date Connected",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, row) => (
                  <tr key={row}>
                    {Array.from({ length: 8 }).map((__, cell) => (
                      <td key={cell}>
                        <div className={styles.skeleton} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : error ? (
          <div className={styles.errorState}>
            <h2>We couldn&apos;t load the service accounts</h2>
            <p>{error}</p>
            <button
              className={styles.secondaryButton}
              onClick={() => load(pagination.page)}
            >
              Try again
            </button>
          </div>
        ) : accounts.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>⌂</div>
            <h2>
              {hasFilters
                ? "No service accounts match your search."
                : "No service accounts found."}
            </h2>
            <p>
              {hasFilters
                ? "Try clearing one or more filters."
                : "Service accounts are created from approved service applications."}
            </p>
            {hasFilters ? (
              <button
                className={styles.secondaryButton}
                onClick={() => {
                  setSearch("");
                  setStatus("");
                  setClassification("");
                  setConnectionType("");
                }}
              >
                Clear filters
              </button>
            ) : (
              <Link
                href="/transactions/service-applications"
                className={styles.button}
              >
                View Service Applications
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Control No.</th>
                    <th>Customer</th>
                    <th>Customer No.</th>
                    <th>Classification</th>
                    <th>Connection Type</th>
                    <th>Date Connected</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.controlNo}>
                      <td className={styles.strong}>{account.controlNo}</td>
                      <td className={styles.strong}>{account.customerName}</td>
                      <td>{account.customerNo}</td>
                      <td>{account.classification}</td>
                      <td>{account.connectionType}</td>
                      <td>
                        {account.dateConnected
                          ? new Intl.DateTimeFormat("en-PH", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              timeZone: "UTC",
                            }).format(
                              new Date(`${account.dateConnected}T00:00:00Z`),
                            )
                          : "Not yet connected"}
                      </td>
                      <td>
                        <AccountStatusBadge
                          code={account.statusCode}
                          name={account.status}
                        />
                      </td>
                      <td>
                        <Link
                          className={styles.viewLink}
                          href={`/transactions/service-accounts/${encodeURIComponent(account.controlNo)}`}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.pagination}>
              <span>
                Showing {(pagination.page - 1) * pagination.pageSize + 1}–
                {Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.total,
                )}{" "}
                of {pagination.total}
              </span>
              <div className={styles.paginationButtons}>
                <button
                  className={styles.ghostButton}
                  disabled={pagination.page <= 1}
                  onClick={() => load(pagination.page - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  className={styles.ghostButton}
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => load(pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </TransactionShell>
  );
}
