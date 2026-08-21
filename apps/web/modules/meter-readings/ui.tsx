"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { TransactionShell } from "@/modules/transactions/ui/transaction-shell";
import styles from "@/modules/transactions/ui/transactions.module.css";

type Reading = {
  readingId: string;
  serviceAccountId: string;
  meterId: string;
  billingPeriodId: string;
  billingPeriod: string;
  readingDate: string;
  previousReading: string;
  presentReading: string;
  consumption: string;
  readingStatusId: string | null;
  readingStatus: string | null;
  meterReaderId: string | null;
  meterReader: string | null;
  remarks: string | null;
  controlNo: string;
  customerName: string;
  meterNo: string;
  meterSize?: string | null;
  routeCode: string | null;
  routeName: string | null;
  createdAt: string;
  updatedAt: string | null;
};
type Option = { id: string; name: string; code?: string };
type Meter = {
  id: string;
  meterNo: string;
  serviceAccountId: string;
  controlNo: string;
  customerName: string;
  previousReading: string;
};
type Options = {
  periods: Option[];
  statuses: Option[];
  readers: Option[];
  routes: Option[];
  meters: Meter[];
};
const date = (v: string | null | undefined) =>
  v
    ? new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${v.slice(0, 10)}T00:00:00Z`))
    : "—";
const num = (v: string | null | undefined) =>
  Number(v || 0).toLocaleString("en-PH", { maximumFractionDigits: 3 });
const badge = (v: string | null) => (
  <span className={`${styles.badge} ${styles.pending}`}>{v || "—"}</span>
);

export function MeterReadingsPage({
  canCreate,
  canEdit,
}: {
  canCreate: boolean;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<Reading[]>([]),
    [options, setOptions] = useState<Options | null>(null),
    [query, setQuery] = useState(""),
    [filters, setFilters] = useState({
      billingPeriod: "",
      route: "",
      status: "",
      reader: "",
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [generationPeriod, setGenerationPeriod] = useState(""),
    [confirmGeneration, setConfirmGeneration] = useState(false),
    [generating, setGenerating] = useState(false),
    [generation, setGeneration] = useState<Record<string, string | number> | null>(null),
    [generationError, setGenerationError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      const [list, option] = await Promise.all([
          fetch(`/api/meter-readings?${params}`, { cache: "no-store" }),
          fetch("/api/meter-readings/options", { cache: "no-store" }),
        ]),
        [a, b] = await Promise.all([list.json(), option.json()]);
      if (!list.ok) throw new Error(a.message);
      if (!option.ok) throw new Error(b.message);
      setRows(a.data);
      setOptions(b.data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load meter readings.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const shown = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q
      ? rows.filter((r) =>
          [r.controlNo, r.customerName, r.meterNo].some((v) =>
            v.toLowerCase().includes(q),
          ),
        )
      : rows;
  }, [rows, query]);
  const selectedPeriod = options?.periods.find((period) => period.id === generationPeriod);
  async function generate() {
    setGenerating(true); setGenerationError("");
    try { const response = await fetch("/api/meter-readings/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ billing_period_id: generationPeriod }) }), body = await response.json(); if (!response.ok) throw new Error(body.message); setGeneration(body.data); setConfirmGeneration(false); setFilters((value) => ({ ...value, billingPeriod: generationPeriod })); await load(); } catch (e) { setGenerationError(e instanceof Error ? e.message : "Meter reading generation could not be completed."); } finally { setGenerating(false); }
  }
  return (
    <TransactionShell active="meter-readings">
      <div className={styles.headingRow}>
        <div>
          <div className={styles.eyebrow}>Billing Operations</div>
          <h1 className={styles.title}>Meter Readings</h1>
          <p className={styles.subtitle}>
            Capture and review readings for the current billing cycle.
          </p>
        </div>
      </div>
      {canCreate && <section className={styles.panel}><div className={styles.cardHeading}><div><h2>Reading Generation</h2><p className={styles.subtitle}>Generate missing readings for eligible active service accounts. Existing readings are never overwritten.</p></div><div className={styles.formActions}><select className={styles.select} value={generationPeriod} onChange={(e) => setGenerationPeriod(e.target.value)}><option value="">Select billing period</option>{options?.periods.map((period) => <option key={period.id} value={period.id}>{period.code} — {period.name}</option>)}</select><button className={styles.button} disabled={!generationPeriod || generating} onClick={() => setConfirmGeneration(true)}>Generate Readings</button></div></div>{generationError && <div className={styles.notice}>{generationError}</div>}{generation && <div className={styles.detailItems}>{[["Active Accounts", generation.total_active_count], ["Generated", generation.generated_count], ["Already Generated", generation.existing_count], ["Not Eligible", generation.not_eligible_count], ["No Route", generation.no_route_count], ["No Reader", generation.no_reader_count], ["No Active Meter", generation.no_meter_count]].map(([label, value]) => <div className={styles.detailItem} key={String(label)}><span>{label}</span><strong>{value ?? 0}</strong></div>)}</div>}</section>}
      <section className={styles.panel}>
        <div
          className={styles.filters}
          style={{ gridTemplateColumns: "repeat(4,minmax(150px,1fr))" }}
        >
          <div className={styles.searchWrap}>
            <input
              className={styles.input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Control no., customer, or meter..."
            />
          </div>
          <Filter
            label="Billing period"
            value={filters.billingPeriod}
            onChange={(v) => setFilters((x) => ({ ...x, billingPeriod: v }))}
            options={options?.periods || []}
          />
          <Filter
            label="Reading route"
            value={filters.route}
            onChange={(v) => setFilters((x) => ({ ...x, route: v }))}
            options={options?.routes || []}
          />
          <Filter
            label="Reading status"
            value={filters.status}
            onChange={(v) => setFilters((x) => ({ ...x, status: v }))}
            options={options?.statuses || []}
          />
          <Filter
            label="Meter reader"
            value={filters.reader}
            onChange={(v) => setFilters((x) => ({ ...x, reader: v }))}
            options={options?.readers || []}
          />
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <Failure message={error} retry={load} />
        ) : shown.length === 0 ? (
          <div className={styles.empty}>
            <h2>No meter readings found.</h2>
            <p>Try another search or filter.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {[
                    "Reading Date",
                    "Billing Period",
                    "Route",
                    "Control No.",
                    "Customer",
                    "Meter No.",
                    "Previous",
                    "Present",
                    "Consumption",
                    "Workflow",
                    "Status",
                    "Reader",
                    "Actions",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.readingId}>
                    <td>{date(r.readingDate)}</td>
                    <td>{r.billingPeriod}</td>
                    <td>{r.routeCode || "—"}</td>
                    <td>{r.controlNo}</td>
                    <td className={styles.strong}>{r.customerName}</td>
                    <td>{r.meterNo}</td>
                    <td>{num(r.previousReading)}</td>
                    <td>{num(r.presentReading)}</td>
                    <td>{num(r.consumption)}</td>
                    <td>{badge(r.readingStatus ? "COMPLETED" : "FOR_READ")}</td>
                    <td>{badge(r.readingStatus)}</td>
                    <td>{r.meterReader || "—"}</td>
                    <td>
                      <Link
                        className={styles.viewLink}
                        href={`/transactions/meter-readings/${r.readingId}`}
                      >
                        View
                      </Link>
                      {canEdit && (
                        <>
                          {" "}
                          <span className={styles.muted}>·</span>{" "}
                          <Link
                            className={styles.viewLink}
                            href={`/transactions/meter-readings/${r.readingId}/edit`}
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
      {confirmGeneration && <div className={styles.dialogBackdrop} role="presentation"><div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Generate meter readings"><h2>Generate Meter Readings?</h2><p>Billing Period: {selectedPeriod ? `${selectedPeriod.code} — ${selectedPeriod.name}` : "—"}</p><p>The system will generate readings for eligible active service accounts. Existing readings will not be overwritten.</p><div className={styles.dialogActions}><button className={styles.secondaryButton} onClick={() => setConfirmGeneration(false)} disabled={generating}>Cancel</button><button className={styles.button} onClick={() => void generate()} disabled={generating}>{generating ? "Generating…" : "Generate"}</button></div></div></div>}
    </TransactionShell>
  );
}

export function MeterReadingDetail({
  readingId,
  canEdit,
  variant = "page",
}: {
  readingId: string;
  canEdit: boolean;
  variant?: "page" | "modal";
}) {
  const isModal = variant === "modal";
  const [item, setItem] = useState<Reading | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/meter-readings/${readingId}`, {
          cache: "no-store",
        }),
        b = await r.json();
      if (!r.ok) throw new Error(b.message);
      setItem(b.data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load meter reading.",
      );
    } finally {
      setLoading(false);
    }
  }, [readingId]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  if (loading)
    return (
      <TransactionShell active="meter-readings" variant={variant}>
        <Loading />
      </TransactionShell>
    );
  if (!item)
    return (
      <TransactionShell active="meter-readings" variant={variant}>
        {!isModal && (
          <Link
            className={styles.backLink}
            href="/transactions/meter-readings"
          >
            ← Meter Readings
          </Link>
        )}
        <Failure message={error} retry={load} />
      </TransactionShell>
    );
  const info: [string, ReactNode][] = [
      ["Reading Date", date(item.readingDate)],
      ["Billing Period", item.billingPeriod],
      ["Reading Status", badge(item.readingStatus)],
      ["Meter Reader", item.meterReader || "—"],
    ],
    account: [string, ReactNode][] = [
      ["Control No.", item.controlNo],
      ["Customer", item.customerName],
      [
        "Reading Route",
        item.routeName ? `${item.routeCode} — ${item.routeName}` : "—",
      ],
    ],
    meter: [string, ReactNode][] = [
      ["Meter No.", item.meterNo],
      ["Meter Size", item.meterSize || "—"],
      ["Previous Reading", num(item.previousReading)],
      ["Present Reading", num(item.presentReading)],
      ["Consumption", num(item.consumption)],
    ];
  return (
    <TransactionShell active="meter-readings" variant={variant}>
      {!isModal && (
        <Link className={styles.backLink} href="/transactions/meter-readings">
          ← Meter Readings
        </Link>
      )}
      <header className={styles.detailHeader}>
        <div>
          <div className={styles.applicationNumber}>
            <h1>Meter Reading #{item.readingId}</h1>
            {badge(item.readingStatus)}
          </div>
          <p className={styles.detailCustomer}>
            {item.controlNo}
            <span>
              {item.customerName} · {item.meterNo}
            </span>
          </p>
        </div>
        {canEdit && (
          <Link
            className={styles.secondaryButton}
            href={`/transactions/meter-readings/${item.readingId}/edit`}
          >
            Edit Reading
          </Link>
        )}
      </header>
      <div className={styles.detailGrid}>
        <div>
          <Card title="Reading Information" values={info} />
          <Card title="Service Account" values={account} />
          <Card title="Meter" values={meter} />
          <section className={styles.detailCard}>
            <div className={styles.cardHeading}>
              <h2>Remarks</h2>
            </div>
            <p className={styles.remarks}>{item.remarks || "—"}</p>
          </section>
          <Card
            title="Audit Information"
            values={[
              ["Created At", time(item.createdAt)],
              ["Updated At", time(item.updatedAt)],
            ]}
          />
        </div>
      </div>
    </TransactionShell>
  );
}

export function MeterReadingForm({
  readingId,
  variant = "page",
}: {
  readingId?: string;
  variant?: "page" | "modal";
}) {
  const isModal = variant === "modal";
  const editing = Boolean(readingId),
    router = useRouter(),
    [options, setOptions] = useState<Options | null>(null),
    [form, setForm] = useState({
      serviceAccountId: "",
      meterId: "",
      readingDate: new Date().toISOString().slice(0, 10),
      presentReading: "",
      readingStatusId: "",
      meterReaderId: "",
      remarks: "",
    }),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const responses = await Promise.all([
            fetch("/api/meter-readings/options", { cache: "no-store" }),
            ...(readingId
              ? [
                  fetch(`/api/meter-readings/${readingId}`, {
                    cache: "no-store",
                  }),
                ]
              : []),
          ]),
          bodies = await Promise.all(responses.map((r) => r.json()));
        if (!responses.every((r) => r.ok))
          throw new Error("Unable to load meter reading information.");
        if (!cancelled) {
          setOptions(bodies[0].data);
          if (readingId) {
            const r = bodies[1].data as Reading;
            setForm({
              serviceAccountId: r.serviceAccountId,
              meterId: r.meterId,
              readingDate: r.readingDate.slice(0, 10),
              presentReading: r.presentReading,
              readingStatusId: r.readingStatusId || "",
              meterReaderId: r.meterReaderId || "",
              remarks: r.remarks || "",
            });
          }
        }
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error
              ? e.message
              : "Unable to load meter reading information.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [readingId]);
  const update = (key: keyof typeof form, value: string) => {
      setForm((x) => ({ ...x, [key]: value }));
      setErrors((x) => ({ ...x, [key]: "" }));
    },
    meters =
      options?.meters.filter(
        (m) =>
          !form.serviceAccountId ||
          m.serviceAccountId === form.serviceAccountId,
      ) || [],
    selected = meters.find((m) => m.id === form.meterId),
    previous = selected?.previousReading || "0",
    consumption = Math.max(
      0,
      Number(form.presentReading || 0) - Number(previous),
    ),
    accounts: Option[] = (options?.meters || [])
      .map((m) => ({
        id: m.serviceAccountId,
        name: `${m.controlNo} — ${m.customerName}`,
      }))
      .filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!form.serviceAccountId)
      local.serviceAccountId = "Select a service account.";
    if (!form.meterId) local.meterId = "Select a meter.";
    if (!form.readingDate) local.readingDate = "Enter a reading date.";
    if (form.presentReading === "" || Number(form.presentReading) < 0)
      local.presentReading = "Enter a non-negative present reading.";
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const r = await fetch(
          editing ? `/api/meter-readings/${readingId}` : "/api/meter-readings",
          {
            method: editing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...form,
              billingPeriodId: options?.periods[0]?.id,
            }),
          },
        ),
        b = await r.json();
      if (!r.ok) {
        setErrors(b.errors || {});
        throw new Error(b.message);
      }
      router.push(
        `/transactions/meter-readings/${b.data.readingId || readingId}?${editing ? "updated" : "created"}=1`,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save meter reading.",
      );
      setSaving(false);
    }
  }
  return (
    <TransactionShell active="meter-readings" variant={variant}>
      <div className={styles.formShell}>
        {!isModal && (
          <Link
            className={styles.backLink}
            href={
              editing
                ? `/transactions/meter-readings/${readingId}`
                : "/transactions/meter-readings"
            }
          >
            ← {editing ? `Reading #${readingId}` : "Meter Readings"}
          </Link>
        )}
        <div className={styles.headingRow}>
          <div>
            <div className={styles.eyebrow}>Billing Operations</div>
            <h1 className={styles.title}>
              {editing ? "Edit Meter Reading" : "New Meter Reading"}
            </h1>
            <p className={styles.subtitle}>
              The open billing period, previous reading, and consumption are
              validated by the server.
            </p>
          </div>
        </div>
        <form
          className={`${styles.panel} ${styles.formPanel}`}
          onSubmit={submit}
        >
          {error && <div className={styles.notice}>{error}</div>}
          {loading ? (
            <Loading />
          ) : (
            <>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Reading Information</h2>
                <div className={styles.fieldGrid}>
                  <div>
                    <label className={styles.label}>Billing Period</label>
                    <input
                      className={styles.input}
                      value={
                        options?.periods[0]
                          ? `${options.periods[0].code} — ${options.periods[0].name}`
                          : "No open billing period"
                      }
                      disabled
                    />
                  </div>
                  <Select
                    label="Service Account"
                    value={form.serviceAccountId}
                    onChange={(v) => {
                      update("serviceAccountId", v);
                      update("meterId", "");
                    }}
                    options={accounts}
                    error={errors.serviceAccountId}
                    required
                  />
                  <Select
                    label="Meter"
                    value={form.meterId}
                    onChange={(v) => update("meterId", v)}
                    options={meters.map((m) => ({ id: m.id, name: m.meterNo }))}
                    error={errors.meterId}
                    required
                  />
                  <Field
                    label="Reading Date"
                    value={form.readingDate}
                    onChange={(v) => update("readingDate", v)}
                    type="date"
                    error={errors.readingDate}
                    required
                  />
                  <div>
                    <label className={styles.label}>Previous Reading</label>
                    <input
                      className={styles.input}
                      value={num(previous)}
                      disabled
                    />
                  </div>
                  <Field
                    label="Present Reading"
                    value={form.presentReading}
                    onChange={(v) => update("presentReading", v)}
                    type="number"
                    error={errors.presentReading}
                    required
                  />
                  <div>
                    <label className={styles.label}>Consumption</label>
                    <input
                      className={styles.input}
                      value={num(consumption.toString())}
                      disabled
                    />
                  </div>
                  <Select
                    label="Reading Status"
                    value={form.readingStatusId}
                    onChange={(v) => update("readingStatusId", v)}
                    options={options?.statuses || []}
                    error={errors.readingStatusId}
                  />
                  <Select
                    label="Meter Reader"
                    value={form.meterReaderId}
                    onChange={(v) => update("meterReaderId", v)}
                    options={options?.readers || []}
                    error={errors.meterReaderId}
                  />
                  <div className={styles.fullField}>
                    <label className={styles.label}>Remarks</label>
                    <textarea
                      className={styles.textarea}
                      value={form.remarks}
                      onChange={(e) => update("remarks", e.target.value)}
                      maxLength={4000}
                    />
                  </div>
                </div>
              </section>
              <div className={styles.formActions}>
                <Link
                  className={styles.secondaryButton}
                  href={
                    editing
                      ? `/transactions/meter-readings/${readingId}`
                      : "/transactions/meter-readings"
                  }
                >
                  Cancel
                </Link>
                <button
                  className={styles.button}
                  disabled={saving || !options?.periods[0]}
                >
                  {saving
                    ? "Saving…"
                    : editing
                      ? "Save Changes"
                      : "Record Reading"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </TransactionShell>
  );
}
function Card({
  title,
  values,
}: {
  title: string;
  values: [string, ReactNode][];
}) {
  return (
    <section className={styles.detailCard}>
      <div className={styles.cardHeading}>
        <h2>{title}</h2>
      </div>
      <div className={styles.detailItems}>
        {values.map(([l, v]) => (
          <div className={styles.detailItem} key={l}>
            <span>{l}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  error,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}> *</span>}
      </label>
      <input
        className={styles.input}
        type={type}
        min={type === "number" ? "0" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
  error,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}> *</span>}
      </label>
      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((o) => (
          <option value={o.id} key={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      {error && <div className={styles.fieldError}>{error}</div>}
    </div>
  );
}
function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}) {
  return (
    <select
      className={styles.select}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">All {label}s</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
function Loading() {
  return (
    <div className={styles.loading}>
      <div className={styles.skeleton} style={{ height: 180 }} />
    </div>
  );
}
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className={`${styles.panel} ${styles.errorState}`}>
      <h2>Meter readings unavailable</h2>
      <p>{message}</p>
      <button className={styles.secondaryButton} onClick={retry}>
        Try again
      </button>
    </div>
  );
}
function time(v: string | null) {
  return v
    ? new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(v))
    : "—";
}
