"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import type {
  ReferenceOption,
  ServiceApplicationRow,
} from "@/modules/service-applications/types";
import { ApplicationStatusBadge } from "./application-status-badge";
import { TransactionShell } from "@/modules/transactions/ui/transaction-shell";
import styles from "@/modules/transactions/ui/transactions.module.css";

type Summary = {
  total: number;
  pending: number;
  processing: number;
  approved: number;
};
type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function SearchIcon() {
  return (
    <svg
      className={styles.searchIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

export function ServiceApplicationsPage() {
  const [applications, setApplications] = useState<ServiceApplicationRow[]>([]);
  const [types, setTypes] = useState<ReferenceOption[]>([]);
  const [statuses, setStatuses] = useState<ReferenceOption[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    pending: 0,
    processing: 0,
    approved: 0,
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
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/service-applications/options")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message);
        setTypes(body.data.types);
        setStatuses(body.data.statuses);
      })
      .catch(() => setError("Unable to load application filters."));
  }, []);

  const loadApplications = useCallback(
    async (page: number) => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "10",
      });
      if (deferredSearch.trim()) params.set("search", deferredSearch.trim());
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      if (date) params.set("date", date);
      try {
        const response = await fetch(`/api/service-applications?${params}`, {
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body.message || "Unable to load service applications.",
          );
        setApplications(body.data);
        setSummary(body.summary);
        setPagination(body.pagination);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load service applications.",
        );
      } finally {
        setLoading(false);
      }
    },
    [date, deferredSearch, status, type],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void loadApplications(1), 0);
    return () => window.clearTimeout(timer);
  }, [loadApplications]);

  const hasFilters = Boolean(search || status || type || date);
  const cards = [
    ["Total Applications", summary.total],
    ["Pending", summary.pending],
    ["For Processing / Inspection", summary.processing],
    ["Approved", summary.approved],
  ] as const;

  return (
    <TransactionShell>
      <div className={styles.headingRow}>
        <div>
          <div className={styles.eyebrow}>Customer Services</div>
          <h1 className={styles.title}>Service Applications</h1>
          <p className={styles.subtitle}>
            Manage and process customer water service applications.
          </p>
        </div>
        <Link
          href="/transactions/service-applications/new"
          className={styles.button}
        >
          ＋ New Application
        </Link>
      </div>

      <section className={styles.summaryGrid} aria-label="Application summary">
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
            <SearchIcon />
            <input
              className={styles.input}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search application or customer..."
              aria-label="Search applications"
            />
          </div>
          <select
            className={styles.select}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Status filter"
          >
            <option value="">All Statuses</option>
            {statuses.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={type}
            onChange={(event) => setType(event.target.value)}
            aria-label="Application type filter"
          >
            <option value="">All Application Types</option>
            {types.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            className={styles.input}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-label="Application date filter"
          />
        </div>

        {loading ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {[
                    "Application No.",
                    "Customer",
                    "Customer No.",
                    "Application Type",
                    "Application Date",
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
                    {Array.from({ length: 7 }).map((__, cell) => (
                      <td key={cell}>
                        <div
                          className={styles.skeleton}
                          style={{ width: cell === 1 ? "150px" : "90px" }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : error ? (
          <div className={styles.errorState}>
            <h2>We couldn&apos;t load the applications</h2>
            <p>{error}</p>
            <button
              className={styles.secondaryButton}
              onClick={() => loadApplications(pagination.page)}
            >
              Try again
            </button>
          </div>
        ) : applications.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>▤</div>
            <h2>
              {hasFilters
                ? "No applications match your search."
                : "No service applications yet."}
            </h2>
            <p>
              {hasFilters
                ? "Try clearing one or more filters."
                : "Create the first service application to begin processing a customer's water connection request."}
            </p>
            {hasFilters ? (
              <button
                className={styles.secondaryButton}
                onClick={() => {
                  setSearch("");
                  setStatus("");
                  setType("");
                  setDate("");
                }}
              >
                Clear filters
              </button>
            ) : (
              <Link
                href="/transactions/service-applications/new"
                className={styles.button}
              >
                ＋ New Application
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Application No.</th>
                    <th>Customer</th>
                    <th>Customer No.</th>
                    <th>Application Type</th>
                    <th>Application Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => (
                    <tr key={application.applicationNo}>
                      <td className={styles.strong}>
                        {application.applicationNo}
                      </td>
                      <td>
                        <div className={styles.strong}>
                          {application.customerName}
                        </div>
                      </td>
                      <td>{application.customerNo}</td>
                      <td>{application.applicationType}</td>
                      <td>
                        {new Intl.DateTimeFormat("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        }).format(
                          new Date(`${application.applicationDate}T00:00:00Z`),
                        )}
                      </td>
                      <td>
                        <ApplicationStatusBadge
                          code={application.statusCode}
                          name={application.status}
                        />
                      </td>
                      <td>
                        <Link
                          href={`/transactions/service-applications/${encodeURIComponent(application.applicationNo)}`}
                          className={styles.viewLink}
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
                  onClick={() => loadApplications(pagination.page - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  className={styles.ghostButton}
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadApplications(pagination.page + 1)}
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
