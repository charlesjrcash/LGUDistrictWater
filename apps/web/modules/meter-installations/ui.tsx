"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TransactionShell } from "@/modules/transactions/ui/transaction-shell";
import styles from "@/modules/transactions/ui/transactions.module.css";

type Installation = {
  installationId: string;
  serviceAccountId: string;
  controlNo: string;
  customerName: string;
  address?: string | null;
  meterId: string;
  meterNo: string;
  meterSize?: string;
  meterType?: string | null;
  meterBrand?: string | null;
  serialNo?: string | null;
  installationDate: string;
  removedDate: string | null;
  installationType: string | null;
  reason: string | null;
  remarks: string | null;
  performedBy: string | null;
  createdAt: string;
};
type Options = {
  accounts: { id: string; controlNo: string; customerName: string }[];
  meters: {
    id: string;
    meterNo: string;
    serviceAccountId: string;
    controlNo: string;
  }[];
};
const date = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
    : "—";
const state = (removedDate: string | null) => (
  <span
    className={`${styles.badge} ${removedDate ? styles.neutral : styles.approved}`}
  >
    {removedDate ? "Removed" : "Installed"}
  </span>
);
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

export function InstallationsPage({
  canCreate,
  canEdit,
}: {
  canCreate: boolean;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<Installation[]>([]),
    [search, setSearch] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/meter-installations", {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setRows(body.data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load meter installations.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q
      ? rows.filter((row) =>
          [
            row.installationId,
            row.controlNo,
            row.customerName,
            row.meterNo,
            row.installationType,
            row.performedBy,
          ].some((value) => value?.toLowerCase().includes(q)),
        )
      : rows;
  }, [rows, search]);
  const cards = [
    ["Total Installations", rows.length],
    ["Installed", rows.filter((row) => !row.removedDate).length],
    ["Removed", rows.filter((row) => row.removedDate).length],
    ["Service Accounts", new Set(rows.map((row) => row.serviceAccountId)).size],
  ] as const;
  return (
    <TransactionShell active="meter-installations">
      <div className={styles.headingRow}>
        <div>
          <div className={styles.eyebrow}>Asset Management</div>
          <h1 className={styles.title}>Meter Installations</h1>
          <p className={styles.subtitle}>
            Maintain the installation history of meters assigned to service
            accounts.
          </p>
        </div>
        {canCreate && (
          <Link
            className={styles.button}
            href="/transactions/meter-installations/new"
          >
            ＋ New Installation
          </Link>
        )}
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
        <div
          className={styles.filters}
          style={{ gridTemplateColumns: "minmax(280px, 1fr)" }}
        >
          <div className={styles.searchWrap}>
            <SearchIcon />
            <input
              className={styles.input}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search installation, account, customer, or meter..."
            />
          </div>
        </div>
        {loading ? (
          <Skeleton />
        ) : error ? (
          <div className={styles.errorState}>
            <h2>We couldn&apos;t load meter installations</h2>
            <p>{error}</p>
            <button className={styles.secondaryButton} onClick={load}>
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>◌</div>
            <h2>
              {search
                ? "No installation records match your search."
                : "No meter installations found."}
            </h2>
            <p>
              {search
                ? "Try a different search term."
                : "Record an installation to begin keeping meter assignment history."}
            </p>
            {canCreate && !search && (
              <Link
                className={styles.button}
                href="/transactions/meter-installations/new"
              >
                ＋ New Installation
              </Link>
            )}
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {[
                    "Installation #",
                    "Service Account",
                    "Customer",
                    "Meter No.",
                    "Installation Date",
                    "Removed Date",
                    "Installation Type",
                    "Performed By",
                    "State",
                    "Actions",
                  ].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.installationId}>
                    <td className={styles.strong}>#{row.installationId}</td>
                    <td>{row.controlNo}</td>
                    <td className={styles.strong}>{row.customerName}</td>
                    <td>{row.meterNo}</td>
                    <td>{date(row.installationDate)}</td>
                    <td>{date(row.removedDate)}</td>
                    <td>{row.installationType || "—"}</td>
                    <td>{row.performedBy || "—"}</td>
                    <td>{state(row.removedDate)}</td>
                    <td>
                      <Link
                        className={styles.viewLink}
                        href={`/transactions/meter-installations/${row.installationId}`}
                      >
                        View
                      </Link>
                      {canEdit && (
                        <>
                          {" "}
                          <span className={styles.muted}>·</span>{" "}
                          <Link
                            className={styles.viewLink}
                            href={`/transactions/meter-installations/${row.installationId}/edit`}
                          >
                            Edit
                          </Link>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </TransactionShell>
  );
}
function Skeleton() {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <tbody>
          {Array.from({ length: 6 }).map((_, row) => (
            <tr key={row}>
              {Array.from({ length: 10 }).map((__, cell) => (
                <td key={cell}>
                  <div className={styles.skeleton} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InstallationDetail({
  installationId,
  canEdit,
  variant = "page",
}: {
  installationId: string;
  canEdit: boolean;
  variant?: "page" | "modal";
}) {
  const isModal = variant === "modal";
  const [item, setItem] = useState<Installation | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/meter-installations/${installationId}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setItem(body.data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load the installation.",
      );
    } finally {
      setLoading(false);
    }
  }, [installationId]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.has("created") || params.has("updated")) {
        setNotice(
          `Meter installation #${installationId} was ${params.has("created") ? "recorded" : "updated"} successfully.`,
        );
        window.history.replaceState({}, "", window.location.pathname);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [installationId]);
  if (loading)
    return (
      <TransactionShell active="meter-installations" variant={variant}>
        <div className={`${styles.panel} ${styles.loading}`}>
          <div className={styles.skeleton} style={{ height: 220 }} />
        </div>
      </TransactionShell>
    );
  if (!item)
    return (
      <TransactionShell active="meter-installations" variant={variant}>
        {!isModal && (
          <Link
            className={styles.backLink}
            href="/transactions/meter-installations"
          >
            ← Meter Installations
          </Link>
        )}
        <div className={`${styles.panel} ${styles.errorState}`}>
          <h2>Installation unavailable</h2>
          <p>{error}</p>
          <button className={styles.secondaryButton} onClick={load}>
            Try again
          </button>
        </div>
      </TransactionShell>
    );
  const info = [
    ["Installation ID", `#${item.installationId}`],
    ["Installation Date", date(item.installationDate)],
    ["Removed Date", date(item.removedDate)],
    ["Installation Type", item.installationType || "—"],
    ["State", state(item.removedDate)],
  ];
  const account = [
    ["Control Number", item.controlNo],
    ["Customer", item.customerName],
    ["Service Address", item.address || "—"],
  ];
  const meter = [
    ["Meter Number", item.meterNo],
    ["Meter Size", item.meterSize || "—"],
    ["Meter Type", item.meterType || "—"],
    ["Meter Brand", item.meterBrand || "—"],
    ["Serial Number", item.serialNo || "—"],
  ];
  return (
    <TransactionShell active="meter-installations" variant={variant}>
      {!isModal && (
        <Link
          className={styles.backLink}
          href="/transactions/meter-installations"
        >
          ← Meter Installations
        </Link>
      )}
      {notice && <div className={styles.successNotice}>{notice}</div>}
      <header className={styles.detailHeader}>
        <div>
          <div className={styles.applicationNumber}>
            <h1>Meter Installation #{item.installationId}</h1>
            {state(item.removedDate)}
          </div>
          <p className={styles.detailCustomer}>
            {item.meterNo}
            <span>
              {item.controlNo} · {item.customerName}
            </span>
          </p>
        </div>
        {canEdit && !isModal && (
          <Link
            className={styles.secondaryButton}
            href={`/transactions/meter-installations/${item.installationId}/edit`}
          >
            Edit Installation
          </Link>
        )}
      </header>
      <div>
          <section className={styles.detailCard}>
            <div className={styles.cardHeading}>
              <h2>Installation Information</h2>
            </div>
            <div className={styles.detailItems}>
              {info.map(([label, value]) => (
                <div className={styles.detailItem} key={String(label)}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            {item.reason && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Reason</h3>
                <p className={styles.remarks}>{item.reason}</p>
              </div>
            )}
            {item.remarks && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Remarks</h3>
                <p className={styles.remarks}>{item.remarks}</p>
              </div>
            )}
          </section>
          <section className={styles.detailCard}>
            <div className={styles.cardHeading}>
              <h2>Service Account</h2>
              <Link
                className={styles.viewLink}
                href={`/transactions/service-accounts/${encodeURIComponent(item.controlNo)}`}
              >
                View Service Account →
              </Link>
            </div>
            <div className={styles.detailItems}>
              {account.map(([label, value]) => (
                <div className={styles.detailItem} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className={styles.detailCard}>
            <div className={styles.cardHeading}>
              <h2>Meter</h2>
              <Link
                className={styles.viewLink}
                href={`/transactions/meters/${encodeURIComponent(item.meterNo)}`}
              >
                View Meter →
              </Link>
            </div>
            <div className={styles.detailItems}>
              {meter.map(([label, value]) => (
                <div className={styles.detailItem} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className={styles.detailCard}>
            <div className={styles.cardHeading}>
              <h2>Audit Information</h2>
            </div>
            <div className={styles.detailItems}>
              <div className={styles.detailItem}>
                <span>Performed By</span>
                <strong>{item.performedBy || "—"}</strong>
              </div>
              <div className={styles.detailItem}>
                <span>Created At</span>
                <strong>
                  {new Intl.DateTimeFormat("en-PH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(item.createdAt))}
                </strong>
              </div>
            </div>
          </section>
      </div>
    </TransactionShell>
  );
}

export function InstallationForm({
  installationId,
  variant = "page",
}: {
  installationId?: string;
  variant?: "page" | "modal";
}) {
  const editing = Boolean(installationId),
    router = useRouter();
  const isModal = variant === "modal";
  const [options, setOptions] = useState<Options | null>(null);
  const [form, setForm] = useState({
    serviceAccountId: "",
    meterId: "",
    installationDate: new Date().toISOString().slice(0, 10),
    removedDate: "",
    installationType: "",
    reason: "",
    remarks: "",
  });
  const [loading, setLoading] = useState(true),
    [submitting, setSubmitting] = useState(false),
    [error, setError] = useState(""),
    [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const responses = await Promise.all([
          fetch("/api/meter-installations/options", { cache: "no-store" }),
          ...(installationId
            ? [
                fetch(`/api/meter-installations/${installationId}`, {
                  cache: "no-store",
                }),
              ]
            : []),
        ]);
        const bodies = await Promise.all(
          responses.map((response) => response.json()),
        );
        if (!responses.every((response) => response.ok))
          throw new Error("Unable to load installation information.");
        if (!cancelled) {
          setOptions(bodies[0].data);
          if (installationId) {
            const item = bodies[1].data as Installation;
            setForm({
              serviceAccountId: item.serviceAccountId,
              meterId: item.meterId,
              installationDate: item.installationDate.slice(0, 10),
              removedDate: item.removedDate?.slice(0, 10) || "",
              installationType: item.installationType || "",
              reason: item.reason || "",
              remarks: item.remarks || "",
            });
          }
        }
      } catch (caught) {
        if (!cancelled)
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load installation information.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [installationId]);
  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.serviceAccountId)
      errors.serviceAccountId = "Select a service account.";
    if (!form.meterId) errors.meterId = "Select a meter.";
    if (!form.installationDate)
      errors.installationDate = "Enter an installation date.";
    if (form.removedDate && form.removedDate < form.installationDate)
      errors.removedDate =
        "Removal date cannot be earlier than the installation date.";
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(
        editing
          ? `/api/meter-installations/${installationId}`
          : "/api/meter-installations",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        setFieldErrors(body.errors || {});
        throw new Error(body.message);
      }
      router.push(
        `/transactions/meter-installations/${body.data.installationId || installationId}?${editing ? "updated" : "created"}=1`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save the installation.",
      );
      setSubmitting(false);
    }
  }
  const availableMeters =
    options?.meters.filter(
      (meter) =>
        !form.serviceAccountId ||
        meter.serviceAccountId === form.serviceAccountId,
    ) || [];
  return (
    <TransactionShell active="meter-installations" variant={variant}>
      <div className={styles.formShell}>
        {!isModal && (
          <Link
            className={styles.backLink}
            href={
              editing
                ? `/transactions/meter-installations/${installationId}`
                : "/transactions/meter-installations"
            }
          >
            ←{" "}
            {editing
              ? `Installation #${installationId}`
              : "Meter Installations"}
          </Link>
        )}
        <div className={styles.headingRow}>
          <div>
            <div className={styles.eyebrow}>Asset Management</div>
            <h1 className={styles.title}>
              {editing ? "Edit Meter Installation" : "New Meter Installation"}
            </h1>
            <p className={styles.subtitle}>
              Record a meter installation while preserving complete service
              account history.
            </p>
          </div>
        </div>
        <form
          className={`${styles.panel} ${styles.formPanel}`}
          onSubmit={submit}
        >
          {error && <div className={styles.notice}>{error}</div>}
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.skeleton} style={{ height: 150 }} />
            </div>
          ) : (
            <>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  Installation Information
                </h2>
                <p className={styles.sectionDescription}>
                  Fields marked with an asterisk are required.
                </p>
                <div className={styles.fieldGrid}>
                  <Select
                    label="Service Account"
                    value={form.serviceAccountId}
                    onChange={(value) => {
                      update("serviceAccountId", value);
                      update("meterId", "");
                    }}
                    options={(options?.accounts || []).map((account) => ({
                      id: account.id,
                      name: `${account.controlNo} — ${account.customerName}`,
                    }))}
                    required
                    error={fieldErrors.serviceAccountId}
                  />
                  <Select
                    label="Meter"
                    value={form.meterId}
                    onChange={(value) => update("meterId", value)}
                    options={availableMeters.map((meter) => ({
                      id: meter.id,
                      name: `${meter.meterNo} — ${meter.controlNo}`,
                    }))}
                    required
                    error={fieldErrors.meterId}
                  />
                  <Field
                    label="Installation Date"
                    type="date"
                    value={form.installationDate}
                    onChange={(value) => update("installationDate", value)}
                    required
                    error={fieldErrors.installationDate}
                  />
                  <Field
                    label="Removed Date"
                    type="date"
                    value={form.removedDate}
                    onChange={(value) => update("removedDate", value)}
                    error={fieldErrors.removedDate}
                  />
                  <Field
                    label="Installation Type"
                    value={form.installationType}
                    onChange={(value) => update("installationType", value)}
                  />
                  <Field
                    label="Reason"
                    value={form.reason}
                    onChange={(value) => update("reason", value)}
                  />
                  <div className={styles.fullField}>
                    <label className={styles.label}>Remarks</label>
                    <textarea
                      className={styles.textarea}
                      value={form.remarks}
                      onChange={(event) =>
                        update("remarks", event.target.value)
                      }
                    />
                  </div>
                </div>
              </section>
              <div className={styles.formActions}>
                <Link
                  className={styles.secondaryButton}
                  href={
                    editing
                      ? `/transactions/meter-installations/${installationId}`
                      : "/transactions/meter-installations"
                  }
                >
                  Cancel
                </Link>
                <button className={styles.button} disabled={submitting}>
                  {submitting
                    ? "Saving…"
                    : editing
                      ? "Save Changes"
                      : "Record Installation"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </TransactionShell>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className={styles.label}>
        {label}
        {required && (
          <>
            {" "}
            <span className={styles.required}>*</span>
          </>
        )}
      </label>
      <input
        className={styles.input}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <div className={styles.fieldError}>{error}</div>}
    </div>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className={styles.label}>
        {label}
        {required && (
          <>
            {" "}
            <span className={styles.required}>*</span>
          </>
        )}
      </label>
      <select
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {error && <div className={styles.fieldError}>{error}</div>}
    </div>
  );
}
