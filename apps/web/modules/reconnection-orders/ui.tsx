"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TransactionShell } from "@/modules/transactions/ui/transaction-shell";
import styles from "@/modules/transactions/ui/transactions.module.css";

type Order = { reconnectionId: string; controlNo: string; customerName: string; orderDate: string; reconnectionDate: string | null; feeAmount: string; paymentStatus: "PAID" | "UNPAID"; performedBy: string | null; status: "PENDING" | "COMPLETED" | "CANCELLED"; remarks: string | null; cancelledBy?: string | null; cancelledByName?: string | null; cancelledAt?: string | null };
type Employee = { employeeId: string; employeeName: string };
type EligibleAccount = { serviceAccountId: string; controlNo: string; customerName: string; address: string | null; meterNo: string | null; connectionStatus: string };
type Organization = { name?: string | null; officeName?: string | null; address?: string | null; tin?: string | null; vatNo?: string | null; contactNo?: string | null; email?: string | null; website?: string | null; logoPath?: string | null; footerNote?: string | null };
type ReportOrder = Order & { address?: string | null; classification?: string | null; connectionStatus?: string | null; meterNo?: string | null; performedByName?: string | null; createdBy?: string | null; createdAt?: string | null; updatedAt?: string | null; organization?: Organization | null };
type OrderDetail = Order & { address?: string | null; meterNo?: string | null; connectionStatus?: string | null; performedByName?: string | null; createdBy?: string | null; createdAt?: string | null; updatedAt?: string | null };
const date = (value: string | null) => value ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`)) : "-";
const timestamp = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
const money = (value: string) => Number(value || 0).toLocaleString("en-PH", { style: "currency", currency: "PHP" });
const badge = (value: string) => <span className={`${styles.badge} ${value === "PAID" || value === "COMPLETED" ? styles.approved : value === "CANCELLED" ? styles.neutral : styles.pending}`}>{value}</span>;
const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export function ReconnectionOrdersPage({ canCreate, canEdit }: { canCreate: boolean; canEdit: boolean }) {
  const [rows, setRows] = useState<Order[]>([]), [search, setSearch] = useState(""), [status, setStatus] = useState(""), [paymentStatus, setPaymentStatus] = useState(""), [loading, setLoading] = useState(true), [error, setError] = useState(""), [selectedId, setSelectedId] = useState<string | null>(null), [previewId, setPreviewId] = useState<string | null>(null), [createOpen, setCreateOpen] = useState(false), [performOrder, setPerformOrder] = useState<Order | null>(null), [editOrderId, setEditOrderId] = useState<string | null>(null), [cancelOrder, setCancelOrder] = useState<Order | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(""); try { const params = new URLSearchParams(); if (search.trim()) params.set("search", search.trim()); if (status) params.set("status", status); if (paymentStatus) params.set("paymentStatus", paymentStatus); const response = await fetch(`/api/reconnection-orders?${params}`, { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.message); setRows(body.data); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load reconnection orders."); } finally { setLoading(false); } }, [search, status, paymentStatus]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 200); return () => window.clearTimeout(timer); }, [load]);
  return (
    <TransactionShell active="reconnection-orders">
      {selectedId && <ReconnectionOrderDetailModal reconnectionId={selectedId} onClose={() => setSelectedId(null)} />}
      {previewId && <ReconnectionOrderReport reconnectionId={previewId} onClose={() => setPreviewId(null)} />}
      {createOpen && <NewReconnectionOrderModal onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); void load(); }} />}
      {performOrder && <PerformReconnectionModal order={performOrder} onClose={() => setPerformOrder(null)} onPerformed={() => void load()} />}
      {editOrderId && <EditReconnectionOrderModal reconnectionId={editOrderId} onClose={() => setEditOrderId(null)} onSaved={() => { setEditOrderId(null); void load(); }} />}
      {cancelOrder && <CancelReconnectionOrderModal order={cancelOrder} onClose={() => setCancelOrder(null)} onCancelled={() => void load()} />}
      <div className={styles.headingRow}>
        <div>
          <div className={styles.eyebrow}>Service Operations</div>
          <h1 className={styles.title}>Reconnection Orders</h1>
          <p className={styles.subtitle}>Review reconnection orders and their payment status.</p>
        </div>
        {canCreate && (
          <button type="button" className={styles.button} onClick={() => setCreateOpen(true)}>
            + New Reconnection Order
          </button>
        )}
      </div>
      <section className={styles.panel}>
        <div className={styles.filters}>
          <input
            className={styles.input}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search control no. or customer..."
          />
          <select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select className={styles.select} value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
            <option value="">All payment statuses</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>
        </div>
        {error && <div className={styles.notice}>{error}</div>}
        {loading ? (
          <div className={styles.loading}>Loading reconnection orders...</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Order ID</th><th>Control No.</th><th>Customer</th><th>Order Date</th><th>Reconnection Date</th><th>Fee Amount</th><th>Payment Status</th><th>Performed By</th><th>Status</th><th>Remarks</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.reconnectionId}>
                    <td>#{row.reconnectionId}</td>
                    <td>{row.controlNo}</td>
                    <td>{row.customerName}</td>
                    <td>{date(row.orderDate)}</td>
                    <td>{date(row.reconnectionDate)}</td>
                    <td>{money(row.feeAmount)}</td>
                    <td>{badge(row.paymentStatus)}</td>
                    <td>{row.performedBy || "-"}</td>
                    <td>{badge(row.status)}</td>
                    <td>{row.remarks || "-"}</td>
                    <td>
                      <button type="button" className={styles.tableAction} onClick={() => setPreviewId(row.reconnectionId)}>Preview Report</button>
                      <button type="button" className={styles.tableAction} onClick={() => setSelectedId(row.reconnectionId)}>View</button>
                      {canEdit && row.status === "PENDING" && (
                        <button type="button" className={styles.tableAction} onClick={() => setEditOrderId(row.reconnectionId)}>Edit</button>
                      )}
                      {canEdit && row.status === "PENDING" && row.paymentStatus === "PAID" && (
                        <button type="button" className={styles.tableAction} onClick={() => setPerformOrder(row)}>Perform Reconnection</button>
                      )}
                      {canEdit && row.status === "PENDING" && row.paymentStatus === "UNPAID" && (
                        <button type="button" className={styles.tableAction} onClick={() => setCancelOrder(row)}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={11} className={styles.empty}>No reconnection orders found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </TransactionShell>
  );
}

function EditReconnectionOrderModal({ reconnectionId, onClose, onSaved }: { reconnectionId: string; onClose: () => void; onSaved: () => void }) {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [editLoading, setEditLoading] = useState(true);
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editOrderDate, setEditOrderDate] = useState("");
  const [editRemarks, setEditRemarks] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/reconnection-orders/${reconnectionId}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body?.success) throw new Error(body?.message || "Unable to load the reconnection order.");
        if (!controller.signal.aborted) {
          const item = body.data as OrderDetail;
          setDetail(item);
          setEditOrderDate(item.orderDate.slice(0, 10));
          setEditRemarks(item.remarks || "");
        }
      })
      .catch((caught) => { if (!controller.signal.aborted) setEditError(caught instanceof Error ? caught.message : "Unable to load the reconnection order."); })
      .finally(() => { if (!controller.signal.aborted) setEditLoading(false); });
    return () => controller.abort();
  }, [reconnectionId]);

  async function save() {
    if (editSaving || editLoading) return;
    if (!editOrderDate) {
      setEditError("Enter an order date before saving.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      const response = await fetch(`/api/reconnection-orders/${reconnectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderDate: editOrderDate, remarks: editRemarks }),
      });
      const body = await response.json();
      if (!response.ok || !body?.success) throw new Error(body?.message || "Unable to update the reconnection order.");
      onSaved();
    } catch (caught) {
      setEditError(caught instanceof Error && caught.message ? caught.message : "Unable to update the reconnection order. Please try again.");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <div className={`${styles.dialog} ${styles.serviceInstallationDialog}`} role="dialog" aria-modal="true" aria-label="Edit reconnection order">
        <h2>Edit Reconnection Order</h2>
        {editLoading ? <p>Loading reconnection order...</p> : detail && <>
          <div className={styles.detailItems}>
            <div className={styles.detailItem}><span>Order ID</span><strong>#{detail.reconnectionId}</strong></div>
            <div className={styles.detailItem}><span>Control No.</span><strong>{detail.controlNo}</strong></div>
            <div className={styles.detailItem}><span>Customer</span><strong>{detail.customerName}</strong></div>
            <div className={styles.detailItem}><span>Service Address</span><strong>{detail.address || "-"}</strong></div>
            <div className={styles.detailItem}><span>Meter No.</span><strong>{detail.meterNo || "-"}</strong></div>
            <div className={styles.detailItem}><span>Fee Amount</span><strong>{money(detail.feeAmount)}</strong></div>
            <div className={styles.detailItem}><span>Payment Status</span><strong>{badge(detail.paymentStatus)}</strong></div>
            <div className={styles.detailItem}><span>Status</span><strong>{badge(detail.status)}</strong></div>
          </div>
          <p className={styles.sectionDescription}>Reconnection Fee remains based on the original order fee snapshot.</p>
          <div className={styles.fieldGrid}>
            <label><span className={styles.label}>Order Date *</span><input className={styles.input} type="date" value={editOrderDate} onChange={(event) => setEditOrderDate(event.target.value)} disabled={editSaving} required /></label>
            <label className={styles.fullField}><span className={styles.label}>Remarks</span><textarea className={styles.textarea} value={editRemarks} onChange={(event) => setEditRemarks(event.target.value)} disabled={editSaving} /></label>
          </div>
        </>}
        {editError && <p className={styles.fieldError}>{editError}</p>}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={editSaving}>Close</button>
          <button type="button" className={styles.button} onClick={() => void save()} disabled={editSaving || editLoading || !detail}>{editSaving ? "Saving..." : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

function CancelReconnectionOrderModal({ order, onClose, onCancelled }: { order: Order; onClose: () => void; onCancelled: () => void }) {
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelResult, setCancelResult] = useState(false);

  async function cancel() {
    if (cancelLoading || cancelResult) return;
    setCancelLoading(true);
    setCancelError("");
    try {
      const response = await fetch(`/api/reconnection-orders/${order.reconnectionId}/cancel`, { method: "POST" });
      const body = await response.json();
      if (!response.ok || !body?.success) throw new Error(body?.message || "Unable to cancel the reconnection order.");
      setCancelResult(true);
      onCancelled();
    } catch (caught) {
      setCancelError(caught instanceof Error && caught.message ? caught.message : "Unable to cancel the reconnection order. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  }

  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <div className={`${styles.dialog} ${styles.serviceInstallationDialog}`} role="dialog" aria-modal="true" aria-label="Cancel reconnection order">
        <h2>{cancelResult ? "Reconnection Order Cancelled" : "Cancel Reconnection Order"}</h2>
        {cancelResult ? <div className={styles.detailItems}><div className={styles.detailItem}><span>Order Status</span><strong>CANCELLED</strong></div><div className={styles.detailItem}><span>Service Account</span><strong>Remains DISCONNECTED</strong></div></div> : <>
          <div className={styles.detailItems}>
            <div className={styles.detailItem}><span>Order ID</span><strong>#{order.reconnectionId}</strong></div>
            <div className={styles.detailItem}><span>Control No.</span><strong>{order.controlNo}</strong></div>
            <div className={styles.detailItem}><span>Customer</span><strong>{order.customerName}</strong></div>
            <div className={styles.detailItem}><span>Fee Amount</span><strong>{money(order.feeAmount)}</strong></div>
            <div className={styles.detailItem}><span>Payment Status</span><strong>{badge(order.paymentStatus)}</strong></div>
          </div>
          <p className={styles.sectionDescription}>This will cancel the pending reconnection order. The service account will remain disconnected.</p>
          {cancelError && <p className={styles.fieldError}>{cancelError}</p>}
        </>}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={cancelLoading}>{cancelResult ? "Close" : "Back"}</button>
          {!cancelResult && <button type="button" className={styles.button} onClick={() => void cancel()} disabled={cancelLoading}>{cancelLoading ? "Cancelling..." : "Cancel Order"}</button>}
        </div>
      </div>
    </div>
  );
}

function PerformReconnectionModal({ order, onClose, onPerformed }: { order: Order; onClose: () => void; onPerformed: () => void }) {
  const [performDate, setPerformDate] = useState(localDate);
  const [performedBy, setPerformedBy] = useState("");
  const [performEmployees, setPerformEmployees] = useState<Employee[]>([]);
  const [performLoading, setPerformLoading] = useState(true);
  const [performError, setPerformError] = useState("");
  const [performResult, setPerformResult] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setPerformLoading(true);
      setPerformError("");
      try {
        const response = await fetch("/api/reconnection-orders/options", { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok || !Array.isArray(body?.data?.employees)) throw new Error();
        if (!controller.signal.aborted) setPerformEmployees(body.data.employees);
      } catch {
        if (!controller.signal.aborted) setPerformError("Unable to load active employees. Please try again.");
      } finally {
        if (!controller.signal.aborted) setPerformLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const selectedEmployee = performEmployees.find((employee) => employee.employeeId === performedBy);

  async function perform() {
    if (performLoading || performResult) return;
    if (!performDate && !performedBy) {
      setPerformError("Enter a reconnection date and select the employee who performed it.");
      return;
    }
    if (!performDate) {
      setPerformError("Enter a reconnection date before continuing.");
      return;
    }
    if (!performedBy) {
      setPerformError("Select the employee who performed the reconnection.");
      return;
    }

    setPerformLoading(true);
    setPerformError("");
    try {
      const response = await fetch(`/api/reconnection-orders/${order.reconnectionId}/perform`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reconnectionDate: performDate, performedBy }),
      });
      const body = await response.json();
      if (!response.ok || !body?.success) throw new Error(body?.message || "Unable to perform reconnection.");
      setPerformResult(true);
      onPerformed();
    } catch (caught) {
      setPerformError(caught instanceof Error && caught.message ? caught.message : "Unable to perform reconnection. Please try again.");
    } finally {
      setPerformLoading(false);
    }
  }

  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <div className={`${styles.dialog} ${styles.serviceInstallationDialog}`} role="dialog" aria-modal="true" aria-label="Perform reconnection">
        <h2>{performResult ? "Service Reconnected Successfully" : "Perform Reconnection"}</h2>
        {performResult ? (
          <div className={styles.detailItems}>
            <div className={styles.detailItem}><span>Order Status</span><strong>COMPLETED</strong></div>
            <div className={styles.detailItem}><span>Service Account Status</span><strong>ACTIVE</strong></div>
            <div className={styles.detailItem}><span>Reconnection Date</span><strong>{date(performDate)}</strong></div>
            <div className={styles.detailItem}><span>Performed By</span><strong>{selectedEmployee?.employeeName || "-"}</strong></div>
          </div>
        ) : (
          <>
            <div className={styles.detailItems}>
              <div className={styles.detailItem}><span>Order ID</span><strong>#{order.reconnectionId}</strong></div>
              <div className={styles.detailItem}><span>Control No.</span><strong>{order.controlNo}</strong></div>
              <div className={styles.detailItem}><span>Customer</span><strong>{order.customerName}</strong></div>
              <div className={styles.detailItem}><span>Fee Amount</span><strong>{money(order.feeAmount)}</strong></div>
              <div className={styles.detailItem}><span>Payment Status</span><strong>{badge(order.paymentStatus)}</strong></div>
            </div>
            <div className={styles.fieldGrid}>
              <label>
                <span className={styles.label}>Reconnection Date *</span>
                <input className={styles.input} type="date" value={performDate} onChange={(event) => setPerformDate(event.target.value)} required />
              </label>
              <label>
                <span className={styles.label}>Performed By *</span>
                <select className={styles.select} value={performedBy} onChange={(event) => setPerformedBy(event.target.value)} disabled={performLoading} required>
                  <option value="">{performLoading ? "Loading..." : "Select active employee"}</option>
                  {performEmployees.map((employee) => <option key={employee.employeeId} value={employee.employeeId}>{employee.employeeName}</option>)}
                </select>
              </label>
            </div>
            {!performLoading && !performError && performEmployees.length === 0 && <p className={styles.fieldError}>No active employees are available.</p>}
            {performError && <p className={styles.fieldError}>{performError}</p>}
          </>
        )}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>{performResult ? "Close" : "Cancel"}</button>
          {!performResult && <button type="button" className={styles.button} onClick={() => void perform()} disabled={performLoading || !performEmployees.length}>{performLoading ? "Reconnecting..." : "Perform Reconnection"}</button>}
        </div>
      </div>
    </div>
  );
}

function NewReconnectionOrderModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [accountBrowserOpen, setAccountBrowserOpen] = useState(false);
  const [browserRows, setBrowserRows] = useState<EligibleAccount[]>([]);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [browserError, setBrowserError] = useState("");
  const [browserSearch, setBrowserSearch] = useState("");
  const [browserSelected, setBrowserSelected] = useState<EligibleAccount | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<EligibleAccount | null>(null);
  const [serviceAccountId, setServiceAccountId] = useState("");
  const [orderDate, setOrderDate] = useState(localDate);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const browserRequest = useRef<AbortController | null>(null);

  const loadBrowserAccounts = useCallback(async (term: string) => {
    browserRequest.current?.abort();
    const controller = new AbortController();
    browserRequest.current = controller;
    setBrowserSelected(null);
    setBrowserLoading(true);
    setBrowserError("");

    try {
      const params = new URLSearchParams();
      if (term.trim()) params.set("search", term.trim());
      const response = await fetch(`/api/reconnection-orders/accounts?${params}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      if (!controller.signal.aborted && browserRequest.current === controller) setBrowserRows(body.data);
    } catch (caught) {
      if (!controller.signal.aborted && browserRequest.current === controller) {
        setBrowserRows([]);
        setBrowserError(caught instanceof Error ? caught.message : "Unable to load disconnected service accounts.");
      }
    } finally {
      if (!controller.signal.aborted && browserRequest.current === controller) setBrowserLoading(false);
    }
  }, []);

  useEffect(() => () => browserRequest.current?.abort(), []);

  function openAccountBrowser() {
    setBrowserSearch("");
    setBrowserSelected(null);
    setAccountBrowserOpen(true);
    void loadBrowserAccounts("");
  }

  function closeAccountBrowser() {
    browserRequest.current?.abort();
    setBrowserSelected(null);
    setAccountBrowserOpen(false);
  }

  function selectAccount() {
    if (!browserSelected) return;
    setServiceAccountId(browserSelected.serviceAccountId);
    setSelectedAccount(browserSelected);
    setBrowserSelected(null);
    setAccountBrowserOpen(false);
  }

  async function saveOrder() {
    if (saving) return;
    if (!serviceAccountId && !orderDate) {
      setCreateError("Select a service account and enter an order date.");
      return;
    }
    if (!serviceAccountId) {
      setCreateError("Select a service account before saving.");
      return;
    }
    if (!orderDate) {
      setCreateError("Enter an order date before saving.");
      return;
    }

    setSaving(true);
    setCreateError("");
    try {
      const response = await fetch("/api/reconnection-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceAccountId, orderDate, remarks }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to create the reconnection order.");
      setSaving(false);
      onSaved();
    } catch (caught) {
      setCreateError(caught instanceof Error ? caught.message : "Unable to create the reconnection order.");
      setSaving(false);
    }
  }

  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <div
        className={`${styles.dialog} ${styles.serviceInstallationDialog}`}
        role="dialog"
        aria-modal="true"
        aria-label="New reconnection order"
      >
        <h2>New Reconnection Order</h2>
        <div className={styles.fieldGrid}>
          <div className={styles.fullField}>
            <span className={styles.label}>Service Account</span>
            <div className={styles.accountPicker}>
              <p className={styles.sectionDescription}>
                {selectedAccount && serviceAccountId
                  ? `${selectedAccount.controlNo} - ${selectedAccount.customerName}`
                  : "No service account selected"}
              </p>
              <button type="button" className={styles.secondaryButton} onClick={openAccountBrowser}>
                Browse
              </button>
            </div>
            {selectedAccount && serviceAccountId && (
              <div className={styles.customerCard}>
                <div className={styles.customerCardItem}>
                  <span>Control No.</span>
                  <strong>{selectedAccount.controlNo}</strong>
                </div>
                <div className={styles.customerCardItem}>
                  <span>Customer</span>
                  <strong>{selectedAccount.customerName}</strong>
                </div>
                <div className={styles.customerCardItem}>
                  <span>Service Address</span>
                  <strong>{selectedAccount.address || "-"}</strong>
                </div>
                <div className={styles.customerCardItem}>
                  <span>Meter No.</span>
                  <strong>{selectedAccount.meterNo || "-"}</strong>
                </div>
                <div className={styles.customerCardItem}>
                  <span>Connection Status</span>
                  <strong>{selectedAccount.connectionStatus}</strong>
                </div>
              </div>
            )}
          </div>
          <label>
            <span className={styles.label}>Order Date</span>
            <input
              className={styles.input}
              type="date"
              value={orderDate}
              onChange={(event) => setOrderDate(event.target.value)}
              required
            />
          </label>
          <label className={styles.fullField}>
            <span className={styles.label}>Reconnection Fee</span>
            <input
              className={styles.input}
              readOnly
              value="Fee will be determined from the applicable Reconnection Fee when the order is saved."
            />
          </label>
          <label className={styles.fullField}>
            <span className={styles.label}>Remarks</span>
            <textarea
              className={styles.textarea}
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
            />
          </label>
        </div>
        {createError && <div className={styles.notice}>{createError}</div>}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={saving}>
            Close
          </button>
          <button type="button" className={styles.button} onClick={() => void saveOrder()} disabled={saving}>
            {saving ? "Saving..." : "Save Reconnection Order"}
          </button>
        </div>
        {accountBrowserOpen && (
          <ReconnectionAccountBrowser
            search={browserSearch}
            rows={browserRows}
            loading={browserLoading}
            error={browserError}
            selected={browserSelected}
            onSearchChange={setBrowserSearch}
            onSearch={() => void loadBrowserAccounts(browserSearch)}
            onSelect={setBrowserSelected}
            onCancel={closeAccountBrowser}
            onConfirm={selectAccount}
          />
        )}
      </div>
    </div>
  );
}

function ReconnectionAccountBrowser({
  search,
  rows,
  loading,
  error,
  selected,
  onSearchChange,
  onSearch,
  onSelect,
  onCancel,
  onConfirm,
}: {
  search: string;
  rows: EligibleAccount[];
  loading: boolean;
  error: string;
  selected: EligibleAccount | null;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onSelect: (account: EligibleAccount) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className={styles.dialogBackdrop} style={{ zIndex: 60 }} role="presentation">
      <div className={styles.accountBrowseDialog} role="dialog" aria-modal="true" aria-label="Select service account">
        <div className={styles.dialogHeader}>
          <h2>Select Service Account</h2>
        </div>
        <div className={styles.accountBrowseSearch}>
          <input
            className={styles.input}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSearch();
              }
            }}
            placeholder="Control no., customer, address, or meter no."
            autoFocus
          />
          <button type="button" className={styles.button} onClick={onSearch}>Search</button>
        </div>
        {error && <div className={styles.notice}>{error}</div>}
        <div className={styles.accountBrowseTableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Control No.</th>
                <th>Customer</th>
                <th>Service Address</th>
                <th>Meter No.</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((account) => (
                <tr
                  key={account.serviceAccountId}
                  className={selected?.serviceAccountId === account.serviceAccountId ? styles.selectedRow : styles.selectableRow}
                  onClick={() => onSelect(account)}
                >
                  <td>{account.controlNo}</td>
                  <td>{account.customerName}</td>
                  <td>{account.address || "-"}</td>
                  <td>{account.meterNo || "-"}</td>
                  <td>{account.connectionStatus}</td>
                </tr>
              ))}
              {loading && <tr><td colSpan={5}>Loading disconnected service accounts...</td></tr>}
              {!loading && !error && !rows.length && <tr><td colSpan={5}>No disconnected service accounts found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={onCancel}>Cancel</button>
          <button type="button" className={styles.button} disabled={!selected} onClick={onConfirm}>Select Account</button>
        </div>
      </div>
    </div>
  );
}

function ReconnectionOrderReport({ reconnectionId, onClose }: { reconnectionId: string; onClose: () => void }) {
  const [order, setOrder] = useState<ReportOrder | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/reconnection-orders/${reconnectionId}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || "Unable to load the reconnection order report.");
        if (!controller.signal.aborted) setOrder(body.data);
      })
      .catch((caught) => {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Unable to load the reconnection order report.");
      });
    return () => controller.abort();
  }, [reconnectionId]);

  const organization = order?.organization;
  const contacts = [["TIN", organization?.tin], ["VAT No.", organization?.vatNo], ["Contact", organization?.contactNo], ["Email", organization?.email], ["Website", organization?.website]].filter(([, value]) => Boolean(value));
  const item = (label: string, value: string | null | undefined) => <div className={styles.detailItem} key={label}><span>{label}</span><strong>{value || "-"}</strong></div>;

  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <div className={`${styles.dialog} ${styles.reconnectionReportDialog}`} role="dialog" aria-modal="true" aria-label="Reconnection Order Report">
        <h2>Reconnection Order Report</h2>
        {error ? (
          <p className={styles.fieldError}>{error}</p>
        ) : !order ? (
          <p>Loading reconnection order report...</p>
        ) : (
          <div id="reconnection-order-print">
            {organization && (
              <header className={styles.organizationHeader}>
                {organization.logoPath && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.organizationLogo} src={organization.logoPath} alt="" />
                )}
                <div className={styles.organizationText}>
                  {organization.name && <strong className={styles.organizationName}>{organization.name}</strong>}
                  {organization.officeName && <span>{organization.officeName}</span>}
                  {organization.address && <span>{organization.address}</span>}
                  {contacts.length > 0 && (
                    <div className={styles.organizationContacts}>
                      {contacts.map(([label, value]) => <span key={String(label)}>{label}: {value}</span>)}
                    </div>
                  )}
                </div>
              </header>
            )}
            <h3 className={styles.sectionTitle}>RECONNECTION ORDER</h3>
            <div className={styles.detailItems}>{item("Reconnection Order ID", `#${order.reconnectionId}`)}</div>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>SERVICE ACCOUNT INFORMATION</h3>
              <div className={styles.detailItems}>
                {item("Control No.", order.controlNo)}
                {item("Customer Name", order.customerName)}
                {item("Service Address", order.address)}
                {item("Classification", order.classification)}
                {item("Connection Status", order.connectionStatus)}
                {item("Meter No.", order.meterNo)}
              </div>
            </section>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>RECONNECTION DETAILS</h3>
              <div className={styles.detailItems}>
                {item("Order ID", `#${order.reconnectionId}`)}
                {item("Order Date", date(order.orderDate))}
                {item("Reconnection Fee", money(order.feeAmount))}
                {item("Payment Status", order.paymentStatus)}
                {item("Status", order.status)}
                {item("Reconnection Date", date(order.reconnectionDate))}
                {item("Performed By", order.performedByName)}
                {item("Remarks", order.remarks)}
              </div>
            </section>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>PAYMENT INFORMATION</h3>
              <div className={styles.detailItems}>
                {item("Reconnection Fee", money(order.feeAmount))}
                {item("Payment Status", order.paymentStatus)}
              </div>
            </section>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>PERSONNEL / AUDIT INFORMATION</h3>
              <div className={styles.detailItems}>
                {item("Performed By", order.performedByName)}
                {item("Prepared By / Created By", order.createdBy)}
                {item("Cancelled By", order.cancelledByName)}
                {item("Cancelled At", timestamp(order.cancelledAt))}
                {item("Created Date", date(order.createdAt || null))}
                {item("Updated Date", date(order.updatedAt || null))}
              </div>
            </section>
            {organization?.footerNote && <p className={styles.organizationFooterNote}>{organization.footerNote}</p>}
          </div>
        )}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>Close</button>
          <button type="button" className={styles.button} onClick={() => window.print()} disabled={!order}>Print Report</button>
        </div>
      </div>
    </div>
  );
}

function ReconnectionOrderDetailModal({ reconnectionId, onClose }: { reconnectionId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<(Order & { address?: string | null; meterNo?: string | null; connectionStatus?: string | null; performedByName?: string | null; createdBy?: string | null; createdAt?: string | null; updatedAt?: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const resetTimer = window.setTimeout(() => { setLoading(true); setDetail(null); setError(""); }, 0);
    void fetch(`/api/reconnection-orders/${reconnectionId}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.message); if (!controller.signal.aborted) setDetail(body.data); })
      .catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Unable to load reconnection order."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { window.clearTimeout(resetTimer); controller.abort(); };
  }, [reconnectionId]);
  const value = (item: string | null | undefined) => item || "-";
  return <div className={styles.dialogBackdrop} role="presentation"><div className={`${styles.dialog} ${styles.serviceInstallationDialog}`} role="dialog" aria-modal="true" aria-label="Reconnection order detail"><h2>Reconnection Order #{reconnectionId}</h2>{loading ? <p>Loading reconnection order...</p> : error ? <p className={styles.fieldError}>{error}</p> : detail && <div className={styles.detailItems}>{[["Order ID", `#${detail.reconnectionId}`],["Control No.", detail.controlNo],["Customer", detail.customerName],["Service Address", value(detail.address)],["Meter No.", value(detail.meterNo)],["Connection Status", value(detail.connectionStatus)],["Order Date", date(detail.orderDate)],["Reconnection Date", date(detail.reconnectionDate)],["Fee Amount", money(detail.feeAmount)],["Payment Status", detail.paymentStatus],["Performed By", value(detail.performedByName)],["Status", detail.status],["Remarks", value(detail.remarks)],["Created By", value(detail.createdBy)],["Cancelled By", value(detail.cancelledByName)],["Cancelled At", timestamp(detail.cancelledAt)],["Created At", timestamp(detail.createdAt)],["Updated At", timestamp(detail.updatedAt)]].map(([label, item]) => <div className={styles.detailItem} key={String(label)}><span>{label}</span><strong>{label === "Payment Status" || label === "Status" ? badge(String(item)) : item}</strong></div>)}</div>}<div className={styles.dialogActions}><button type="button" className={styles.secondaryButton} onClick={onClose}>Close</button></div></div></div>;
}
