"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/static-components */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TransactionShell } from "@/modules/transactions/ui/transaction-shell";
import styles from "@/modules/transactions/ui/transactions.module.css";
type Bill = Record<string, string | null> & {
  billId: string;
  billNo: string;
  serviceAccountId: string;
  billingPeriodId: string;
  billDate: string;
  status: string;
  totalAmountDue: string;
  controlNo: string;
  customerName: string;
  billingPeriod: string;
};
type Options = {
  serviceAccounts: {
    serviceAccountId: string;
    controlNo: string;
    customerName: string;
    serviceType: string | null;
  }[];
  billingPeriods: {
    billingPeriodId: string;
    periodCode: string;
    periodName: string;
    status: string;
  }[];
  meterReadings: {
    readingId: string;
    serviceAccountId: string;
    billingPeriodId: string;
    previousReading: string;
    presentReading: string;
    consumption: string;
    readingDate: string;
  }[];
};
const money = (v: string | null | undefined) =>
  Number(v || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });
const date = (v: string | null | undefined) =>
  v
    ? new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(`${v.slice(0, 10)}T00:00:00Z`))
    : "—";
const initial = {
  serviceAccountId: "",
  billingPeriodId: "",
  readingId: "",
  billDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  waterConsumptionAmount: "0",
  previousBalance: "0",
  penaltyAmount: "0",
  connectionFeeAmount: "0",
  adjustmentAmount: "0",
  status: "UNPAID",
  remarks: "",
};
function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(url, { cache: "no-store" }),
        b = await r.json();
      if (!r.ok) throw new Error(b.message);
      setData(b.data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load information.");
    } finally {
      setLoading(false);
    }
  }, [url]);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, error, loading, load };
}
export function BillsPage({
  canCreate,
  canEdit,
}: {
  canCreate: boolean;
  canEdit: boolean;
}) {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [period, setPeriod] = useState(""),
    [page, setPage] = useState(1);
  const query = new URLSearchParams({ page: String(page), pageSize: "10" });
  if (search) query.set("search", search);
  if (status) query.set("status", status);
  if (period) query.set("billingPeriod", period);
  const { data, error, loading, load } = useFetch<{
    data: Bill[];
    pagination: { page: number; totalPages: number };
  }>(`/api/bills?${query}`);
  return (
    <TransactionShell>
      <div className={styles.headingRow}>
        <div>
          <div className={styles.eyebrow}>Billing Operations</div>
          <h1 className={styles.title}>Bills</h1>
          <p className={styles.subtitle}>
            Review and manage recorded bill amounts.
          </p>
        </div>
        {canCreate && (
          <Link className={styles.button} href="/transactions/bills/new">
            ＋ New Bill
          </Link>
        )}
      </div>
      <section className={styles.panel}>
        <div className={styles.filters}>
          <input
            className={styles.input}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Bill no., control no., or customer..."
          />
          <select
            className={styles.select}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {["UNPAID", "PAID", "PARTIAL", "VOID"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <input
            className={styles.input}
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              setPage(1);
            }}
            inputMode="numeric"
            placeholder="Billing period ID"
          />
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <Failure message={error} retry={load} />
        ) : !data?.data.length ? (
          <div className={styles.empty}>
            <h2>No bills found.</h2>
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {[
                      "Bill No.",
                      "Control No.",
                      "Customer",
                      "Billing Period",
                      "Bill Date",
                      "Due Date",
                      "Water Amount",
                      "Previous Balance",
                      "Penalty",
                      "Total Due",
                      "Status",
                      "Actions",
                    ].map((x) => (
                      <th key={x}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((b) => (
                    <tr key={b.billId}>
                      <td className={styles.strong}>{b.billNo}</td>
                      <td>{b.controlNo}</td>
                      <td>{b.customerName}</td>
                      <td>{b.billingPeriod}</td>
                      <td>{date(b.billDate)}</td>
                      <td>{date(b.dueDate)}</td>
                      <td>{money(b.waterConsumptionAmount)}</td>
                      <td>{money(b.previousBalance)}</td>
                      <td>{money(b.penaltyAmount)}</td>
                      <td className={styles.strong}>
                        {money(b.totalAmountDue)}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${styles.pending}`}>
                          {b.status}
                        </span>
                      </td>
                      <td>
                        <Link
                          className={styles.viewLink}
                          href={`/transactions/bills/${encodeURIComponent(b.billNo)}`}
                        >
                          View
                        </Link>
                        {canEdit && (
                          <>
                            <span className={styles.muted}> · </span>
                            <Link
                              className={styles.viewLink}
                              href={`/transactions/bills/${encodeURIComponent(b.billNo)}/edit`}
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
            <div className={styles.formActions}>
              <button
                className={styles.secondaryButton}
                disabled={page <= 1}
                onClick={() => setPage((x) => x - 1)}
              >
                Previous
              </button>
              <span>
                Page {data.pagination.page} of {data.pagination.totalPages}
              </span>
              <button
                className={styles.secondaryButton}
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((x) => x + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </TransactionShell>
  );
}
export function BillDetail({
  billNo,
  canEdit,
}: {
  billNo: string;
  canEdit: boolean;
}) {
  const {
    data: item,
    loading,
    error,
    load,
  } = useFetch<Bill>(`/api/bills/${encodeURIComponent(billNo)}`);
  if (loading)
    return (
      <TransactionShell>
        <Loading />
      </TransactionShell>
    );
  if (!item)
    return (
      <TransactionShell>
        <Link className={styles.backLink} href="/transactions/bills">
          ← Bills
        </Link>
        <Failure message={error} retry={load} />
      </TransactionShell>
    );
  const Card = ({
    title,
    rows,
  }: {
    title: string;
    rows: [string, string][];
  }) => (
    <section className={styles.detailCard}>
      <div className={styles.cardHeading}>
        <h2>{title}</h2>
      </div>
      <div className={styles.detailItems}>
        {rows.map(([a, b]) => (
          <div className={styles.detailItem} key={a}>
            <span>{a}</span>
            <strong>{b}</strong>
          </div>
        ))}
      </div>
    </section>
  );
  return (
    <TransactionShell>
      <Link className={styles.backLink} href="/transactions/bills">
        ← Bills
      </Link>
      <header className={styles.detailHeader}>
        <div>
          <div className={styles.applicationNumber}>
            <h1>{item.billNo}</h1>
            <span className={`${styles.badge} ${styles.pending}`}>
              {item.status}
            </span>
          </div>
          <p className={styles.detailCustomer}>
            {item.controlNo}
            <span>{item.customerName}</span>
          </p>
        </div>
        {canEdit && (
          <Link
            className={styles.secondaryButton}
            href={`/transactions/bills/${encodeURIComponent(item.billNo)}/edit`}
          >
            Edit Bill
          </Link>
        )}
      </header>
      <div className={styles.detailGrid}>
        <div>
          <Card
            title="Bill Information"
            rows={[
              ["Billing Period", item.billingPeriod],
              ["Bill Date", date(item.billDate)],
              ["Due Date", date(item.dueDate)],
              ["Status", item.status],
            ]}
          />
          <Card
            title="Customer / Account"
            rows={[
              ["Control No.", item.controlNo],
              ["Customer", item.customerName],
              ["Service Account", item.serviceAccountId],
            ]}
          />
          <Card
            title="Meter Reading"
            rows={
              item.readingId
                ? [
                    ["Reading ID", item.readingId],
                    ["Meter No.", item.meterNo || "—"],
                    ["Reading Date", date(item.readingDate)],
                    ["Previous Reading", item.previousReading || "0"],
                    ["Present Reading", item.presentReading || "0"],
                    ["Consumption", item.consumption || "0"],
                  ]
                : [["Linked reading", "No linked meter reading"]]
            }
          />
          <Card
            title="Bill Amounts"
            rows={[
              ["Water Consumption", money(item.waterConsumptionAmount)],
              ["Previous Balance", money(item.previousBalance)],
              ["Penalty", money(item.penaltyAmount)],
              ["Connection Fee", money(item.connectionFeeAmount)],
              ["Adjustment", money(item.adjustmentAmount)],
              ["Total Amount Due", money(item.totalAmountDue)],
            ]}
          />
          <Card title="Remarks" rows={[["Remarks", item.remarks || "—"]]} />
          <Card
            title="Audit"
            rows={[
              ["Created At", item.createdAt || "—"],
              ["Updated At", item.updatedAt || "—"],
            ]}
          />
        </div>
      </div>
    </TransactionShell>
  );
}
export function BillForm({ billNo }: { billNo?: string }) {
  const editing = Boolean(billNo),
    router = useRouter(),
    options = useFetch<Options>("/api/bills/options"),
    existing = useFetch<Bill>(
      editing
        ? `/api/bills/${encodeURIComponent(billNo!)}`
        : "/api/bills/options?form=1",
    ),
    [form, setForm] = useState(initial),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (editing && existing.data) {
      const b = existing.data;
      setForm({
        serviceAccountId: b.serviceAccountId,
        billingPeriodId: b.billingPeriodId,
        readingId: b.readingId || "",
        billDate: b.billDate.slice(0, 10),
        dueDate: b.dueDate?.slice(0, 10) || "",
        waterConsumptionAmount: b.waterConsumptionAmount || "0",
        previousBalance: b.previousBalance || "0",
        penaltyAmount: b.penaltyAmount || "0",
        connectionFeeAmount: b.connectionFeeAmount || "0",
        adjustmentAmount: b.adjustmentAmount || "0",
        status: b.status,
        remarks: b.remarks || "",
      });
    }
  }, [editing, existing.data]);
  const update = (key: keyof typeof initial, value: string) => {
    setForm((x) => ({ ...x, [key]: value }));
    setErrors((x) => ({ ...x, [key]: "" }));
  };
  const readings = useMemo(
    () =>
      options.data?.meterReadings.filter(
        (r) =>
          r.serviceAccountId === form.serviceAccountId &&
          r.billingPeriodId === form.billingPeriodId,
      ) || [],
    [options.data, form.serviceAccountId, form.billingPeriodId],
  );
  const calculated = [
    form.waterConsumptionAmount,
    form.previousBalance,
    form.penaltyAmount,
    form.connectionFeeAmount,
    form.adjustmentAmount,
  ].reduce((s, x) => s + (Number(x) || 0), 0);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const r = await fetch(
          editing ? `/api/bills/${encodeURIComponent(billNo!)}` : "/api/bills",
          {
            method: editing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          },
        ),
        b = await r.json();
      if (!r.ok) {
        setErrors(b.errors || {});
        throw new Error(b.message);
      }
      router.push(
        `/transactions/bills/${encodeURIComponent(b.data.billNo || billNo!)}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save bill.");
    } finally {
      setSaving(false);
    }
  }
  const Field = ({
    label,
    name,
    type = "text",
    disabled = false,
  }: {
    label: string;
    name: keyof typeof initial;
    type?: string;
    disabled?: boolean;
  }) => (
    <div>
      <label className={styles.label}>{label}</label>
      <input
        className={styles.input}
        type={type}
        min={type === "number" ? undefined : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={form[name]}
        disabled={disabled}
        onChange={(e) => update(name, e.target.value)}
      />
      {errors[name] && <div className={styles.fieldError}>{errors[name]}</div>}
    </div>
  );
  if (options.loading || (editing && existing.loading))
    return (
      <TransactionShell>
        <Loading />
      </TransactionShell>
    );
  if (options.error || (editing && existing.error))
    return (
      <TransactionShell>
        <Failure
          message={options.error || existing.error}
          retry={options.load}
        />
      </TransactionShell>
    );
  return (
    <TransactionShell>
      <div className={styles.formShell}>
        <Link
          className={styles.backLink}
          href={
            editing
              ? `/transactions/bills/${encodeURIComponent(billNo!)}`
              : "/transactions/bills"
          }
        >
          ← {editing ? "Bill" : "Bills"}
        </Link>
        <div className={styles.headingRow}>
          <div>
            <div className={styles.eyebrow}>Billing Operations</div>
            <h1 className={styles.title}>
              {editing ? "Edit Bill" : "New Bill"}
            </h1>
            <p className={styles.subtitle}>
              Amounts are totaled and validated by the server.
            </p>
          </div>
        </div>
        <form
          className={`${styles.panel} ${styles.formPanel}`}
          onSubmit={submit}
        >
          {error && <div className={styles.notice}>{error}</div>}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Bill Information</h2>
            <div className={styles.fieldGrid}>
              {editing ? (
                <>
                  <div>
                    <label className={styles.label}>Bill No.</label>
                    <input className={styles.input} value={billNo} disabled />
                  </div>
                  <div>
                    <label className={styles.label}>Service Account</label>
                    <input
                      className={styles.input}
                      value={
                        existing.data
                          ? `${existing.data.controlNo} — ${existing.data.customerName}`
                          : ""
                      }
                      disabled
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Billing Period</label>
                    <input
                      className={styles.input}
                      value={existing.data?.billingPeriod || ""}
                      disabled
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Meter Reading</label>
                    <input
                      className={styles.input}
                      value={
                        existing.data?.readingId || "No linked meter reading"
                      }
                      disabled
                    />
                  </div>
                </>
              ) : (
                <>
                  <Select
                    label="Service Account"
                    value={form.serviceAccountId}
                    onChange={(v) => {
                      update("serviceAccountId", v);
                      update("readingId", "");
                    }}
                    options={
                      options.data?.serviceAccounts.map((x) => ({
                        id: x.serviceAccountId,
                        label: `${x.controlNo} — ${x.customerName}`,
                      })) || []
                    }
                    error={errors.serviceAccountId}
                  />
                  <Select
                    label="Billing Period"
                    value={form.billingPeriodId}
                    onChange={(v) => {
                      update("billingPeriodId", v);
                      update("readingId", "");
                    }}
                    options={
                      options.data?.billingPeriods.map((x) => ({
                        id: x.billingPeriodId,
                        label: `${x.periodCode} — ${x.periodName}`,
                      })) || []
                    }
                    error={errors.billingPeriodId}
                  />
                  <Select
                    label="Meter Reading (optional)"
                    value={form.readingId}
                    onChange={(v) => update("readingId", v)}
                    options={readings.map((x) => ({
                      id: x.readingId,
                      label: `#${x.readingId} — ${x.readingDate} (${x.consumption})`,
                    }))}
                    error={errors.readingId}
                  />
                </>
              )}
              <Field label="Bill Date" name="billDate" type="date" />
              <Field label="Due Date" name="dueDate" type="date" />
              <Select
                label="Status"
                value={form.status}
                onChange={(v) => update("status", v)}
                options={["UNPAID", "PAID", "PARTIAL", "VOID"].map((x) => ({
                  id: x,
                  label: x,
                }))}
                error={errors.status}
              />
            </div>
          </section>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Bill Amounts</h2>
            <div className={styles.fieldGrid}>
              <Field
                label="Water Consumption Amount"
                name="waterConsumptionAmount"
                type="number"
              />
              <Field
                label="Previous Balance"
                name="previousBalance"
                type="number"
              />
              <Field
                label="Penalty Amount"
                name="penaltyAmount"
                type="number"
              />
              <Field
                label="Connection Fee Amount"
                name="connectionFeeAmount"
                type="number"
              />
              <Field
                label="Adjustment Amount"
                name="adjustmentAmount"
                type="number"
              />
              <div>
                <label className={styles.label}>Total Amount Due</label>
                <input
                  className={styles.input}
                  value={money(String(calculated))}
                  disabled
                />
              </div>
              <div className={styles.fullField}>
                <label className={styles.label}>Remarks</label>
                <textarea
                  className={styles.textarea}
                  value={form.remarks}
                  onChange={(e) => update("remarks", e.target.value)}
                />
              </div>
            </div>
          </section>
          <div className={styles.formActions}>
            <Link
              className={styles.secondaryButton}
              href={
                editing
                  ? `/transactions/bills/${encodeURIComponent(billNo!)}`
                  : "/transactions/bills"
              }
            >
              Cancel
            </Link>
            <button className={styles.button} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Bill"}
            </button>
          </div>
        </form>
      </div>
    </TransactionShell>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
  error?: string;
}) {
  return (
    <div>
      <label className={styles.label}>{label}</label>
      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((x) => (
          <option key={x.id} value={x.id}>
            {x.label}
          </option>
        ))}
      </select>
      {error && <div className={styles.fieldError}>{error}</div>}
    </div>
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
      <h2>Bills unavailable</h2>
      <p>{message}</p>
      <button className={styles.secondaryButton} onClick={retry}>
        Try again
      </button>
    </div>
  );
}
