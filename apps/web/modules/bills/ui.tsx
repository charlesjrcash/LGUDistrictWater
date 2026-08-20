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
  details?: {
    billDetailId: string;
    chargeType: string;
    description: string | null;
    quantity: string;
    rate: string;
    amount: string;
    sequenceNo: number | null;
  }[];
  penalties?: { billPenaltyId: string; penaltyName: string; baseAmount: string; rate: string; amount: string }[];
  adjustments?: { adjustmentId: string; adjustmentType: string; amount: string; reason: string | null; approvedBy: string | null; approvedAt: string | null }[];
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
    [pagination, setPagination] = useState<{
      page: number;
      totalPages: number;
    } | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(url, { cache: "no-store" }),
        b = await r.json();
      if (!r.ok) throw new Error(b.message);
      setData(b.data);
      setPagination(b.pagination || null);
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
  return { data, pagination, error, loading, load };
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
  const { data, pagination, error, loading, load } = useFetch<Bill[]>(
    `/api/bills?${query}`,
  );
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
        ) : !data?.length ? (
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
                  {data.map((b) => (
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
                Page {pagination?.page || 1} of {pagination?.totalPages || 1}
              </span>
              <button
                className={styles.secondaryButton}
                disabled={page >= (pagination?.totalPages || 1)}
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
  const [penaltyModal, setPenaltyModal] = useState<string | null>(null);
  const [adjustmentModal, setAdjustmentModal] = useState<string | null>(null);
  const [approval, setApproval] = useState<NonNullable<Bill["adjustments"]>[number] | null>(null);
  const [removal, setRemoval] = useState<{ kind: "penalty" | "adjustment"; id: string; label: string; amount: string; reason?: string | null } | null>(null);
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
            title="Bill Summary"
            rows={[
              ["Water Consumption Amount", money(item.waterConsumptionAmount)],
              ["Current Charges", money(item.currentCharges)],
              ["Previous Balance", money(item.previousBalance)],
              ["Penalty", money(item.penaltyAmount)],
              ["Connection Fee", money(item.connectionFeeAmount)],
              ["Adjustment", money(item.adjustmentAmount)],
              ["Total Amount Due", money(item.totalAmountDue)],
            ]}
          />
          <section className={styles.detailCard}>
            <div className={styles.cardHeading}>
              <h2>Bill Details</h2>
            </div>
            {!item.details?.length ? (
              <p className={styles.remarks}>
                No water-consumption charges were recorded.
              </p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Sequence</th>
                      <th>Description</th>
                      <th>Charge Type</th>
                      <th>Quantity</th>
                      <th>Rate</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.details.map((detail) => (
                      <tr key={detail.billDetailId}>
                        <td>{detail.sequenceNo ?? "—"}</td>
                        <td>{detail.description || detail.chargeType}</td>
                        <td>{detail.chargeType}</td>
                        <td>{detail.quantity}</td>
                        <td>{money(detail.rate)}</td>
                        <td>{money(detail.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className={styles.detailCard}>
            <div className={styles.cardHeading}><h2>Penalties</h2>{canEdit && <button className={styles.secondaryButton} onClick={() => setPenaltyModal("create")}>+ Add Penalty</button>}</div>
            {!item.penalties?.length ? <p className={styles.remarks}>No penalties have been applied.</p> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Penalty</th><th>Base Amount</th><th>Rate</th><th>Amount</th>{canEdit && <th>Actions</th>}</tr></thead><tbody>{item.penalties.map((penalty) => <tr key={penalty.billPenaltyId}><td>{penalty.penaltyName}</td><td>{money(penalty.baseAmount)}</td><td>{penalty.rate}%</td><td>{money(penalty.amount)}</td>{canEdit && <td><button className={styles.viewLink} onClick={() => setPenaltyModal(penalty.billPenaltyId)}>Edit</button><button className={styles.viewLink} onClick={() => setRemoval({ kind: "penalty", id: penalty.billPenaltyId, label: penalty.penaltyName, amount: penalty.amount })}> · Remove</button></td>}</tr>)}</tbody></table></div>}
          </section>
          <section className={styles.detailCard}>
            <div className={styles.cardHeading}><h2>Adjustments</h2>{canEdit && <button className={styles.secondaryButton} onClick={() => setAdjustmentModal("create")}>+ Add Adjustment</button>}</div>
            {!item.adjustments?.length ? <p className={styles.remarks}>No adjustments have been recorded.</p> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Type</th><th>Amount</th><th>Reason</th><th>Approved By</th><th>Approved At</th>{canEdit && <th>Actions</th>}</tr></thead><tbody>{item.adjustments.map((adjustment) => <tr key={adjustment.adjustmentId}><td>{adjustment.adjustmentType}</td><td>{money(adjustment.amount)}</td><td>{adjustment.reason || "—"}</td><td>{adjustment.approvedBy || "Pending"}</td><td>{date(adjustment.approvedAt)}</td>{canEdit && !adjustment.approvedAt && <td><button className={styles.viewLink} onClick={() => setAdjustmentModal(adjustment.adjustmentId)}>Edit</button><button className={styles.viewLink} onClick={() => setRemoval({ kind: "adjustment", id: adjustment.adjustmentId, label: adjustment.adjustmentType, amount: adjustment.amount, reason: adjustment.reason })}> · Remove</button><button className={styles.viewLink} onClick={() => setApproval(adjustment)}> · Approve</button></td>}</tr>)}</tbody></table></div>}
          </section>
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
      {penaltyModal && <PenaltyModal billId={item.billId} penalty={item.penalties?.find((x) => x.billPenaltyId === penaltyModal)} onClose={() => setPenaltyModal(null)} onSaved={() => { setPenaltyModal(null); void load(); }} />}
      {adjustmentModal && <AdjustmentModal billId={item.billId} adjustment={item.adjustments?.find((x) => x.adjustmentId === adjustmentModal)} onClose={() => setAdjustmentModal(null)} onSaved={() => { setAdjustmentModal(null); void load(); }} />}
      {removal && <RemovalDialog removal={removal} onClose={() => setRemoval(null)} onRemoved={() => { setRemoval(null); void load(); }} />}
      {approval && <ApprovalDialog adjustment={approval} onClose={() => setApproval(null)} onApproved={() => { setApproval(null); void load(); }} />}
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
                disabled
              />
              <Field
                label="Previous Balance"
                name="previousBalance"
                type="number"
              />
              <Field
                label="Penalty Amount (from penalties)"
                name="penaltyAmount"
                type="number"
                disabled
              />
              <Field
                label="Connection Fee Amount"
                name="connectionFeeAmount"
                type="number"
              />
              <Field
                label="Adjustment Amount (approved adjustments)"
                name="adjustmentAmount"
                type="number"
                disabled
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
function ApprovalDialog({ adjustment, onClose, onApproved }: { adjustment: NonNullable<Bill["adjustments"]>[number]; onClose: () => void; onApproved: () => void }) {
  const [error, setError] = useState(""), [approving, setApproving] = useState(false);
  async function approve() { setApproving(true); setError(""); try { const r = await fetch(`/api/bill-adjustments/${adjustment.adjustmentId}/approve`, { method: "POST" }), b = await r.json(); if (!r.ok) throw new Error(b.message); onApproved(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to approve adjustment."); } finally { setApproving(false); } }
  return <div className={styles.dialogBackdrop} role="presentation"><div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Approve adjustment"><h2>Approve Adjustment</h2><p>Are you sure you want to approve this adjustment? It will affect the bill total.</p><p>Adjustment Type: {adjustment.adjustmentType}</p><p>Amount: {money(adjustment.amount)}</p><p>Reason: {adjustment.reason || "—"}</p>{error && <p className={styles.fieldError}>{error}</p>}<div className={styles.dialogActions}><button className={styles.secondaryButton} onClick={onClose} disabled={approving}>Cancel</button><button className={styles.button} onClick={() => void approve()} disabled={approving}>{approving ? "Approving…" : "Approve"}</button></div></div></div>;
}

function RemovalDialog({ removal, onClose, onRemoved }: { removal: { kind: "penalty" | "adjustment"; id: string; label: string; amount: string; reason?: string | null }; onClose: () => void; onRemoved: () => void }) {
  const [error, setError] = useState(""), [removing, setRemoving] = useState(false); const title = removal.kind === "penalty" ? "Remove this penalty?" : "Remove this pending adjustment?";
  async function remove() { setRemoving(true); setError(""); try { const r = await fetch(`/api/${removal.kind === "penalty" ? "bill-penalties" : "bill-adjustments"}/${removal.id}`, { method: "DELETE" }), b = await r.json(); if (!r.ok) throw new Error(b.message); onRemoved(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to remove record."); } finally { setRemoving(false); } }
  return <div className={styles.dialogBackdrop} role="presentation"><div className={styles.dialog} role="dialog" aria-modal="true" aria-label={title}><h2>{title}</h2><p>{removal.kind === "penalty" ? "Penalty" : "Adjustment Type"}: {removal.label}</p><p>Amount: {money(removal.amount)}</p>{removal.reason && <p>Reason: {removal.reason}</p>}{error && <p className={styles.fieldError}>{error}</p>}<div className={styles.dialogActions}><button className={styles.secondaryButton} onClick={onClose} disabled={removing}>Cancel</button><button className={styles.button} onClick={() => void remove()} disabled={removing}>{removing ? "Removing…" : removal.kind === "penalty" ? "Remove Penalty" : "Remove Adjustment"}</button></div></div></div>;
}

function PenaltyModal({ billId, penalty, onClose, onSaved }: { billId: string; penalty?: NonNullable<Bill["penalties"]>[number]; onClose: () => void; onSaved: () => void }) {
  const [baseAmount, setBaseAmount] = useState(penalty?.baseAmount || ""), [penaltyId, setPenaltyId] = useState(""), [types, setTypes] = useState<{ penaltyId: string; penaltyName: string; rate: string }[]>([]), [error, setError] = useState(""), [saving, setSaving] = useState(false);
  useEffect(() => { void (async () => { const r = await fetch(`/api/bill-penalties?options=1&billId=${billId}`), b = await r.json(); if (r.ok) { setTypes(b.data.penaltyTypes); if (!penalty) setBaseAmount(b.data.baseAmount); } else setError(b.message); })(); }, [billId, penalty]);
  const selected = types.find((x) => x.penaltyId === penaltyId); const amount = baseAmount && selected ? (Number(baseAmount) * Number(selected.rate) / 100).toFixed(2) : "0.00";
  async function save(e: React.FormEvent) { e.preventDefault(); setSaving(true); setError(""); try { const r = await fetch(penalty ? `/api/bill-penalties/${penalty.billPenaltyId}` : "/api/bill-penalties", { method: penalty ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(penalty ? { baseAmount } : { billId, penaltyId, baseAmount }) }), b = await r.json(); if (!r.ok) throw new Error(b.message); onSaved(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save penalty."); } finally { setSaving(false); } }
  return <div className={styles.dialogBackdrop} role="presentation"><form className={styles.dialog} onSubmit={save}><h2>{penalty ? "Edit Bill Penalty" : "Add Bill Penalty"}</h2>{error && <p className={styles.fieldError}>{error}</p>}<div className={styles.fieldGrid}>{penalty ? <div><label className={styles.label}>Penalty Type</label><input className={styles.input} value={penalty.penaltyName} disabled /></div> : <div><label className={styles.label}>Penalty Type</label><select className={styles.select} value={penaltyId} onChange={(e) => setPenaltyId(e.target.value)} required><option value="">Select penalty type</option>{types.map((x) => <option key={x.penaltyId} value={x.penaltyId}>{x.penaltyName}</option>)}</select></div>}<div><label className={styles.label}>Base Amount</label><input className={styles.input} type="number" min="0.01" step="0.01" value={baseAmount} onChange={(e) => setBaseAmount(e.target.value)} required /></div>{!penalty && <><div><label className={styles.label}>Penalty Rate</label><input className={styles.input} value={selected ? `${selected.rate}%` : "Select a penalty type"} disabled /></div><div><label className={styles.label}>Penalty Amount</label><input className={styles.input} value={money(amount)} disabled /></div></>}</div><div className={styles.dialogActions}><button type="button" className={styles.secondaryButton} onClick={onClose}>Cancel</button><button className={styles.button} disabled={saving}>{saving ? "Saving…" : "Save Penalty"}</button></div></form></div>;
}

function AdjustmentModal({ billId, adjustment, onClose, onSaved }: { billId: string; adjustment?: NonNullable<Bill["adjustments"]>[number]; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState(adjustment?.adjustmentType || "CREDIT"), [amount, setAmount] = useState(adjustment ? String(Math.abs(Number(adjustment.amount))) : ""), [reason, setReason] = useState(adjustment?.reason || ""), [error, setError] = useState(""), [saving, setSaving] = useState(false);
  async function save(e: React.FormEvent) { e.preventDefault(); setSaving(true); setError(""); try { const r = await fetch(adjustment ? `/api/bill-adjustments/${adjustment.adjustmentId}` : "/api/bill-adjustments", { method: adjustment ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ billId, adjustmentType: type, amount, reason }) }), b = await r.json(); if (!r.ok) throw new Error(b.message); onSaved(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save adjustment."); } finally { setSaving(false); } }
  return <div className={styles.dialogBackdrop} role="presentation"><form className={styles.dialog} onSubmit={save}><h2>{adjustment ? "Edit Bill Adjustment" : "Add Bill Adjustment"}</h2><p>New adjustments remain pending approval and do not affect the bill total until approved.</p>{error && <p className={styles.fieldError}>{error}</p>}<div className={styles.fieldGrid}><div><label className={styles.label}>Adjustment Type</label><select className={styles.select} value={type} onChange={(e) => setType(e.target.value)}><option value="CREDIT">CREDIT</option><option value="DEBIT">DEBIT</option></select></div><div><label className={styles.label}>Amount</label><input className={styles.input} type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div><div className={styles.fullField}><label className={styles.label}>Reason</label><textarea className={styles.textarea} value={reason} onChange={(e) => setReason(e.target.value)} required /></div></div><div className={styles.dialogActions}><button type="button" className={styles.secondaryButton} onClick={onClose}>Cancel</button><button className={styles.button} disabled={saving}>{saving ? "Saving…" : "Save Adjustment"}</button></div></form></div>;
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
