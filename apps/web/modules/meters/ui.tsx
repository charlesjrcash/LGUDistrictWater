"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TransactionShell } from "@/modules/transactions/ui/transaction-shell";
import styles from "@/modules/transactions/ui/transactions.module.css";

type Meter = {
  meterNo: string;
  serviceAccountId?: string;
  controlNo: string;
  customerName: string;
  address?: string | null;
  meterSize: string;
  meterSizeId?: string;
  meterType: string | null;
  meterTypeId?: string | null;
  meterBrand: string | null;
  meterBrandId?: string | null;
  serialNo?: string | null;
  installationDate: string | null;
  initialReading: string;
  status: string;
  remarks?: string | null;
  serviceType?: string | null;
  readingRoute?: string | null;
  connectionStatus?: string | null;
  dateConnected?: string | null;
};
type Option = { id: string; name: string };
type AccountOption = {
  id: string;
  controlNo: string;
  customerName: string;
  address: string | null;
};
type Options = {
  accounts: AccountOption[];
  sizes: Option[];
  types: Option[];
  brands: Option[];
  statuses: string[];
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}
function MeterStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const kind =
    normalized === "ACTIVE"
      ? "approved"
      : normalized === "PENDING"
        ? "pending"
        : normalized === "INACTIVE" || normalized === "CLOSED"
          ? "neutral"
          : "rejected";
  return <span className={`${styles.badge} ${styles[kind]}`}>{status}</span>;
}
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

export function MetersPage({
  canCreate,
  canEdit,
}: {
  canCreate: boolean;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<Meter[]>([]),
    [query, setQuery] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/meters", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setRows(body.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load meters.",
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
    const term = query.trim().toLowerCase();
    return term
      ? rows.filter((row) =>
          [
            row.meterNo,
            row.controlNo,
            row.customerName,
            row.meterSize,
            row.meterType,
            row.meterBrand,
            row.status,
          ].some((value) => value?.toLowerCase().includes(term)),
        )
      : rows;
  }, [query, rows]);
  const cards = [
    ["Total Meters", rows.length],
    ["Active", rows.filter((row) => row.status === "ACTIVE").length],
    ["Inactive", rows.filter((row) => row.status === "INACTIVE").length],
    [
      "Disconnected",
      rows.filter((row) => row.status === "DISCONNECTED").length,
    ],
  ] as const;
  return (
    <TransactionShell active="meters">
      <div className={styles.headingRow}>
        <div>
          <div className={styles.eyebrow}>Asset Management</div>
          <h1 className={styles.title}>Meters</h1>
          <p className={styles.subtitle}>
            Manage registered water meters and their service account
            assignments.
          </p>
        </div>
        {canCreate && (
          <Link className={styles.button} href="/transactions/meters/new">
            ＋ Add Meter
          </Link>
        )}
      </div>
      <section className={styles.summaryGrid} aria-label="Meter summary">
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
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search meters..."
              aria-label="Search meters"
            />
          </div>
        </div>
        {loading ? (
          <MeterTableSkeleton />
        ) : error ? (
          <div className={styles.errorState}>
            <h2>We couldn&apos;t load the meters</h2>
            <p>{error}</p>
            <button className={styles.secondaryButton} onClick={load}>
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>◌</div>
            <h2>
              {query ? "No meters match your search." : "No meters found."}
            </h2>
            <p>
              {query
                ? "Try a different search term."
                : "Add a meter to begin registering water meter assets."}
            </p>
            {query ? (
              <button
                className={styles.secondaryButton}
                onClick={() => setQuery("")}
              >
                Clear search
              </button>
            ) : (
              canCreate && (
                <Link className={styles.button} href="/transactions/meters/new">
                  ＋ Add Meter
                </Link>
              )
            )}
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {[
                    "Meter No.",
                    "Control No.",
                    "Customer",
                    "Meter Size",
                    "Meter Type",
                    "Brand",
                    "Installation Date",
                    "Initial Reading",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.meterNo}>
                    <td className={styles.strong}>{row.meterNo}</td>
                    <td>{row.controlNo}</td>
                    <td className={styles.strong}>{row.customerName}</td>
                    <td>{row.meterSize}</td>
                    <td>{row.meterType || "—"}</td>
                    <td>{row.meterBrand || "—"}</td>
                    <td>{formatDate(row.installationDate)}</td>
                    <td>
                      {Number(row.initialReading).toLocaleString("en-PH")}
                    </td>
                    <td>
                      <MeterStatusBadge status={row.status} />
                    </td>
                    <td>
                      <Link
                        className={styles.viewLink}
                        href={`/transactions/meters/${encodeURIComponent(row.meterNo)}`}
                      >
                        View
                      </Link>
                      {canEdit && (
                        <>
                          {" "}
                          <span className={styles.muted}>·</span>{" "}
                          <Link
                            className={styles.viewLink}
                            href={`/transactions/meters/${encodeURIComponent(row.meterNo)}/edit`}
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
function MeterTableSkeleton() {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {Array.from({ length: 10 }).map((_, index) => (
              <th key={index}>Loading</th>
            ))}
          </tr>
        </thead>
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

export function MeterDetail({
  meterNo,
  canEdit,
}: {
  meterNo: string;
  canEdit: boolean;
}) {
  const [meter, setMeter] = useState<Meter | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/meters/${encodeURIComponent(meterNo)}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setMeter(body.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load the meter.",
      );
    } finally {
      setLoading(false);
    }
  }, [meterNo]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.has("created"))
        setNotice(`Meter ${meterNo} was created successfully.`);
      if (params.has("updated"))
        setNotice(`Meter ${meterNo} was updated successfully.`);
      if (params.has("created") || params.has("updated"))
        window.history.replaceState({}, "", window.location.pathname);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [meterNo]);
  if (loading)
    return (
      <TransactionShell active="meters">
        <div className={`${styles.panel} ${styles.loading}`}>
          <div className={styles.skeleton} style={{ height: 220 }} />
        </div>
      </TransactionShell>
    );
  if (!meter)
    return (
      <TransactionShell active="meters">
        <Link className={styles.backLink} href="/transactions/meters">
          ← Meters
        </Link>
        <div className={`${styles.panel} ${styles.errorState}`}>
          <h2>Meter unavailable</h2>
          <p>{error}</p>
          <button className={styles.secondaryButton} onClick={load}>
            Try again
          </button>
        </div>
      </TransactionShell>
    );
  const meterFields: [string, React.ReactNode][] = [
    ["Meter No.", meter.meterNo],
    ["Meter Size", meter.meterSize],
    ["Meter Type", meter.meterType || "—"],
    ["Meter Brand", meter.meterBrand || "—"],
    ["Serial No.", meter.serialNo || "—"],
    ["Installation Date", formatDate(meter.installationDate)],
    ["Initial Reading", Number(meter.initialReading).toLocaleString("en-PH")],
    ["Status", <MeterStatusBadge key="status" status={meter.status} />],
  ];
  const accountFields = [
    ["Control No.", meter.controlNo],
    ["Customer", meter.customerName],
    ["Customer Address", meter.address || "—"],
    ["Service Type", meter.serviceType || "—"],
    ["Route", meter.readingRoute || "—"],
    ["Connection Status", meter.connectionStatus || "—"],
    ["Date Connected", formatDate(meter.dateConnected)],
  ];
  return (
    <TransactionShell active="meters">
      <Link className={styles.backLink} href="/transactions/meters">
        ← Meters
      </Link>
      {notice && <div className={styles.successNotice}>{notice}</div>}
      <header className={styles.detailHeader}>
        <div>
          <div className={styles.applicationNumber}>
            <h1>Meter Details</h1>
            <MeterStatusBadge status={meter.status} />
          </div>
          <p className={styles.detailCustomer}>
            {meter.meterNo}
            <span>{meter.customerName}</span>
          </p>
        </div>
        {canEdit && (
          <Link
            className={styles.secondaryButton}
            href={`/transactions/meters/${encodeURIComponent(meter.meterNo)}/edit`}
          >
            Edit Meter
          </Link>
        )}
      </header>
      <div className={styles.detailGrid}>
        <div>
          <section className={styles.detailCard}>
            <div className={styles.cardHeading}>
              <h2>Meter Information</h2>
            </div>
            <div className={styles.detailItems}>
              {meterFields.map(([label, value]) => (
                <div className={styles.detailItem} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            {meter.remarks && (
              <div
                className={styles.section}
                style={{ marginTop: 22, paddingTop: 20 }}
              >
                <h3 className={styles.sectionTitle}>Remarks</h3>
                <p className={styles.remarks}>{meter.remarks}</p>
              </div>
            )}
          </section>
          <section className={styles.detailCard}>
            <div className={styles.cardHeading}>
              <h2>Service Account</h2>
              <Link
                className={styles.viewLink}
                href={`/transactions/service-accounts/${encodeURIComponent(meter.controlNo)}`}
              >
                View Service Account →
              </Link>
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
        </div>
      </div>
    </TransactionShell>
  );
}

export function MeterForm({ meterNo }: { meterNo?: string }) {
  const isEditing = Boolean(meterNo),
    router = useRouter();
  const [options, setOptions] = useState<Options | null>(null),
    [meter, setMeter] = useState<Meter | null>(null);
  const [form, setForm] = useState({
    serviceAccountId: "",
    meterNo: "",
    meterSizeId: "",
    meterTypeId: "",
    meterBrandId: "",
    serialNo: "",
    installationDate: "",
    initialReading: "0",
    status: "ASSIGNED",
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
        const calls = [fetch("/api/meters/options", { cache: "no-store" })];
        if (meterNo)
          calls.push(
            fetch(`/api/meters/${encodeURIComponent(meterNo)}`, {
              cache: "no-store",
            }),
          );
        const responses = await Promise.all(calls),
          bodies = await Promise.all(
            responses.map((response) => response.json()),
          );
        if (!responses.every((response) => response.ok))
          throw new Error(
            bodies.find((body, index) => !responses[index].ok)?.message ||
              "Unable to load meter information.",
          );
        if (!cancelled) {
          setOptions(bodies[0].data);
          if (meterNo) {
            const detail = bodies[1].data as Meter;
            setMeter(detail);
            setForm({
              serviceAccountId: detail.serviceAccountId || "",
              meterNo: detail.meterNo,
              meterSizeId: detail.meterSizeId || "",
              meterTypeId: detail.meterTypeId || "",
              meterBrandId: detail.meterBrandId || "",
              serialNo: detail.serialNo || "",
              installationDate: detail.installationDate?.slice(0, 10) || "",
              initialReading: detail.initialReading,
              status: detail.status,
              remarks: detail.remarks || "",
            });
          }
        }
      } catch (loadError) {
        if (!cancelled)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load meter information.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [meterNo]);
  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const errors: Record<string, string> = {};
    if (!isEditing && !form.serviceAccountId)
      errors.serviceAccountId = "Select a service account.";
    if (!isEditing && !form.meterNo.trim())
      errors.meterNo = "Enter a meter number.";
    if (!form.meterSizeId) errors.meterSizeId = "Select a meter size.";
    if (!form.initialReading || Number(form.initialReading) < 0)
      errors.initialReading = "Enter a non-negative initial reading.";
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = isEditing
        ? {
            meterSizeId: form.meterSizeId,
            meterTypeId: form.meterTypeId,
            meterBrandId: form.meterBrandId,
            serialNo: form.serialNo,
            installationDate: form.installationDate,
            initialReading: form.initialReading,
            status: form.status,
            remarks: form.remarks,
          }
        : form;
      const response = await fetch(
        isEditing
          ? `/api/meters/${encodeURIComponent(meterNo!)}`
          : "/api/meters",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        setFieldErrors(body.errors || {});
        throw new Error(body.message || "Unable to save the meter.");
      }
      const savedMeterNo = isEditing ? meterNo! : body.data.meterNo;
      router.push(
        `/transactions/meters/${encodeURIComponent(savedMeterNo)}?${isEditing ? "updated" : "created"}=1`,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save the meter.",
      );
      setSubmitting(false);
    }
  }
  const selectedAccount = options?.accounts.find(
      (account) => account.id === form.serviceAccountId,
    ),
    fieldsDisabled = loading || submitting;
  return (
    <TransactionShell active="meters">
      <div className={styles.formShell}>
        <Link
          className={styles.backLink}
          href={
            isEditing
              ? `/transactions/meters/${encodeURIComponent(meterNo!)}`
              : "/transactions/meters"
          }
        >
          ← {isEditing ? meterNo : "Meters"}
        </Link>
        <div className={styles.headingRow}>
          <div>
            <div className={styles.eyebrow}>Asset Management</div>
            <h1 className={styles.title}>
              {isEditing ? "Edit Meter" : "Add Meter"}
            </h1>
            <p className={styles.subtitle}>
              {isEditing
                ? "Update the meter information. Its service account relationship remains unchanged."
                : "Register a water meter and assign it to a service account."}
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
                <h2 className={styles.sectionTitle}>Meter Information</h2>
                <p className={styles.sectionDescription}>
                  Fields marked with an asterisk are required.
                </p>
                <div className={styles.fieldGrid}>
                  {!isEditing && (
                    <SelectField
                      label="Service Account / Control No."
                      value={form.serviceAccountId}
                      onChange={(value) => update("serviceAccountId", value)}
                      options={(options?.accounts || []).map((account) => ({
                        id: account.id,
                        name: `${account.controlNo} — ${account.customerName}`,
                      }))}
                      required
                      error={fieldErrors.serviceAccountId}
                      full
                    />
                  )}
                  {isEditing && meter && (
                    <div
                      className={`${styles.customerCard} ${styles.fullField}`}
                    >
                      {[
                        ["Control No.", meter.controlNo],
                        ["Customer", meter.customerName],
                        ["Customer Address", meter.address || "—"],
                      ].map(([label, value]) => (
                        <div className={styles.customerCardItem} key={label}>
                          <span>{label}</span>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                  {!isEditing && selectedAccount && (
                    <div
                      className={`${styles.customerCard} ${styles.fullField}`}
                    >
                      {[
                        ["Control No.", selectedAccount.controlNo],
                        ["Customer", selectedAccount.customerName],
                        ["Address", selectedAccount.address || "—"],
                      ].map(([label, value]) => (
                        <div className={styles.customerCardItem} key={label}>
                          <span>{label}</span>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                  <TextField
                    label="Meter No."
                    value={form.meterNo}
                    onChange={(value) => update("meterNo", value)}
                    required
                    error={fieldErrors.meterNo}
                    disabled={isEditing || fieldsDisabled}
                  />
                  <SelectField
                    label="Meter Size"
                    value={form.meterSizeId}
                    onChange={(value) => update("meterSizeId", value)}
                    options={options?.sizes || []}
                    required
                    error={fieldErrors.meterSizeId}
                    disabled={fieldsDisabled}
                  />
                  <SelectField
                    label="Meter Type"
                    value={form.meterTypeId}
                    onChange={(value) => update("meterTypeId", value)}
                    options={options?.types || []}
                    disabled={fieldsDisabled}
                  />
                  <SelectField
                    label="Meter Brand"
                    value={form.meterBrandId}
                    onChange={(value) => update("meterBrandId", value)}
                    options={options?.brands || []}
                    disabled={fieldsDisabled}
                  />
                  <TextField
                    label="Serial No."
                    value={form.serialNo}
                    onChange={(value) => update("serialNo", value)}
                    disabled={fieldsDisabled}
                  />
                  <div>
                    <label className={styles.label}>Installation Date</label>
                    <input
                      className={styles.input}
                      type="date"
                      value={form.installationDate}
                      onChange={(event) =>
                        update("installationDate", event.target.value)
                      }
                      disabled={fieldsDisabled}
                    />
                  </div>
                  <TextField
                    label="Initial Reading"
                    value={form.initialReading}
                    onChange={(value) => update("initialReading", value)}
                    type="number"
                    min="0"
                    required
                    error={fieldErrors.initialReading}
                    disabled={fieldsDisabled}
                  />
                  <SelectField
                    label="Status"
                    value={form.status}
                    onChange={(value) => update("status", value)}
                    options={(options?.statuses || []).map((status) => ({
                      id: status,
                      name: status,
                    }))}
                    required
                    disabled={fieldsDisabled}
                  />
                  <div className={styles.fullField}>
                    <label className={styles.label}>Remarks</label>
                    <textarea
                      className={styles.textarea}
                      value={form.remarks}
                      onChange={(event) =>
                        update("remarks", event.target.value)
                      }
                      maxLength={4000}
                      disabled={fieldsDisabled}
                    />
                  </div>
                </div>
              </section>
              <div className={styles.formActions}>
                <Link
                  className={styles.secondaryButton}
                  href={
                    isEditing
                      ? `/transactions/meters/${encodeURIComponent(meterNo!)}`
                      : "/transactions/meters"
                  }
                >
                  Cancel
                </Link>
                <button className={styles.button} disabled={fieldsDisabled}>
                  {submitting
                    ? "Saving…"
                    : isEditing
                      ? "Save Changes"
                      : "Create Meter"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </TransactionShell>
  );
}
function TextField({
  label,
  value,
  onChange,
  required,
  error,
  type = "text",
  min,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  type?: string;
  min?: string;
  disabled?: boolean;
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
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
      {error && <div className={styles.fieldError}>{error}</div>}
    </div>
  );
}
function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  error,
  disabled,
  full,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  required?: boolean;
  error?: string;
  disabled?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? styles.fullField : undefined}>
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
        disabled={disabled}
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
