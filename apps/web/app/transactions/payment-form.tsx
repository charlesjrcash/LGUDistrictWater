"use client"; /* eslint-disable react-hooks/set-state-in-effect */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { TransactionShell } from "@/modules/transactions/ui/transaction-shell";
import styles from "@/modules/transactions/ui/transactions.module.css";
type Customer = {
    customerId: string;
    customerNo: string;
    customerName: string;
};
type Account = {
    serviceAccountId: string;
    customerId: string;
    controlNo: string;
    customerName: string;
    status: string;
    address?: string | null;
    meterNo?: string;
    routeCode?: string;
};
type Option = {
    paymentTypeId?: string;
    paymentTypeCode?: string;
    paymentMethodId?: string;
    receiptTypeId?: string;
    name: string;
};
type ReconnectionOrder = {
    reconnectionId: string;
    serviceAccountId: string;
    feeAmount: string;
    status: string;
};
type Bill = {
    billId: string;
    billNo: string;
    billDate: string;
    dueDate: string | null;
    totalAmountDue: string;
    penaltyAmount: string;
    adjustmentAmount: string;
    amountPaid: string;
    outstanding: string;
};
type Data = {
    customers: Customer[];
    paymentTypes: Option[];
    paymentMethods: Option[];
    receiptTypes: Option[];
    serviceAccounts: Account[];
    outstandingBills: Bill[];
};
type Saved = {
    account: Account | null;
    receiptNo: string;
    customerName: string;
    controlNo: string;
    paymentDate: string;
    paymentAmount: string;
    paymentMethod: string;
    paymentType: string;
    referenceNo: string | null;
    totalAllocated: string;
    remaining: string;
    allocations: {
        billNo: string;
        billDate: string;
        penaltyAmount: string;
        adjustmentAmount: string;
        amount: string;
        resultingStatus: string;
    }[];
};
const money = (v: string | number) => Number(v || 0).toLocaleString("en-PH", { style: "currency", currency: "PHP" });
const today = new Date().toISOString().slice(0, 10);
const emptyBills: Bill[] = [];
export function PaymentForm() { const [data, setData] = useState<Data | null>(null), [customer, setCustomer] = useState(""), [account, setAccount] = useState(""), [value, setValue] = useState(""), [type, setType] = useState(""), [method, setMethod] = useState(""), [receiptType, setReceiptType] = useState(""), [date, setDate] = useState(today), [reference, setReference] = useState(""), [remarks, setRemarks] = useState(""), [mode, setMode] = useState<"AUTO" | "MANUAL">("AUTO"), [manual, setManual] = useState<Record<string, string>>({}), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState<Saved | null>(null), [browserOpen, setBrowserOpen] = useState(false), [browserRows, setBrowserRows] = useState<Account[]>([]), [browserSearch, setBrowserSearch] = useState(""), [browserSelected, setBrowserSelected] = useState<Account | null>(null), [browserLoading, setBrowserLoading] = useState(false), [browserError, setBrowserError] = useState(""), [reconnectionOrder, setReconnectionOrder] = useState<ReconnectionOrder | null>(null), [reconnectionLoading, setReconnectionLoading] = useState(false), [reconnectionError, setReconnectionError] = useState(""); const browserRequest = useRef<AbortController | null>(null); const load = async (c = "", a = "") => { setLoading(true); try {
    const q = new URLSearchParams();
    if (c)
        q.set("customerId", c);
    if (a)
        q.set("serviceAccountId", a);
    const r = await fetch(`/api/payments${q.size ? `?${q}` : ""}`, { cache: "no-store" }), b = await r.json();
    if (!r.ok)
        throw new Error(b.message);
    setData(b.data);
    setError("");
}
catch (e) {
    setError(e instanceof Error ? e.message : "Unable to load payment information.");
}
finally {
    setLoading(false);
} }; useEffect(() => { void load(); }, []); const bills = data?.outstandingBills ?? emptyBills, selected = data?.serviceAccounts.find(x => x.serviceAccountId === account), selectedPaymentType = data?.paymentTypes.find(x => x.paymentTypeId === type), isReconnectionPayment = selectedPaymentType?.paymentTypeCode?.trim().toUpperCase() === "RECONNECTION"; useEffect(() => { const controller = new AbortController(); setReconnectionOrder(null); setReconnectionError(""); setReconnectionLoading(false); if (!isReconnectionPayment) {
    setValue("");
    return;
} setValue(""); if (!account)
    return; setReconnectionLoading(true); fetch(`/api/payments/reconnection-order?serviceAccountId=${encodeURIComponent(account)}`, { cache: "no-store", signal: controller.signal }).then(async (r) => { const b = await r.json(); if (!r.ok)
    throw new Error(b.message); if (b.data.serviceAccountId !== account)
    throw new Error("The reconnection order does not match the selected service account."); setReconnectionOrder(b.data); setValue(b.data.feeAmount); }).catch(e => { if (!controller.signal.aborted) {
    setReconnectionOrder(null);
    setValue("");
    setReconnectionError(e instanceof Error ? e.message : "Unable to load the reconnection fee.");
} }).finally(() => { if (!controller.signal.aborted)
    setReconnectionLoading(false); }); return () => controller.abort(); }, [account, isReconnectionPayment]); useEffect(() => () => browserRequest.current?.abort(), []);
// The browser reload intentionally tracks payment-type mode while open.
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => { if (!browserOpen) return; setBrowserSelected(null); setBrowserRows([]); void browseAccounts(); }, [isReconnectionPayment]); const automatic = useMemo(() => Object.fromEntries(bills.reduce<{
    remaining: number;
    entries: [
        string,
        string
    ][];
}>((state, b) => { const allocation = Math.min(state.remaining, Number(b.outstanding)); return { remaining: state.remaining - allocation, entries: [...state.entries, [b.billId, allocation > 0 ? allocation.toFixed(2) : ""]] }; }, { remaining: Number(value) || 0, entries: [] }).entries), [bills, value]); const allocations = mode === "AUTO" ? automatic : manual; const allocated = Object.values(allocations).reduce((s, v) => s + (Number(v) || 0), 0), remaining = (Number(value) || 0) - allocated, totalOutstanding = bills.reduce((s, b) => s + Number(b.outstanding), 0); async function browseAccounts() { browserRequest.current?.abort(); const controller = new AbortController(); browserRequest.current = controller; setBrowserSelected(null); setBrowserLoading(true); setBrowserError(""); try {
    const q = new URLSearchParams({ page: "1", pageSize: "20" });
    if (browserSearch.trim())
        q.set("search", browserSearch.trim());
    if (isReconnectionPayment)
        q.set("mode", "reconnection");
    const r = await fetch("/api/payments/accounts?" + q, { cache: "no-store", signal: controller.signal }), b = await r.json();
    if (!r.ok)
        throw new Error(b.message);
    if (!controller.signal.aborted && browserRequest.current === controller)
        setBrowserRows(b.data);
}
catch (e) {
    if (!controller.signal.aborted && browserRequest.current === controller) {
        setBrowserRows([]);
        setBrowserError(e instanceof Error ? e.message : "Unable to load service accounts. Please try again.");
    }
}
finally {
    if (!controller.signal.aborted && browserRequest.current === controller)
        setBrowserLoading(false);
} } function openBrowser() { setBrowserSelected(null); setBrowserOpen(true); void browseAccounts(); } function chooseBrowsedAccount() { if (!browserSelected)
    return; setCustomer(browserSelected.customerId); setAccount(browserSelected.serviceAccountId); setManual({}); setBrowserOpen(false); void load(browserSelected.customerId, browserSelected.serviceAccountId); } function setAllocation(b: Bill, v: string) { if (v === "" || (/^\d*(\.\d{0,2})?$/.test(v) && Number(v) <= Number(b.outstanding)))
    setManual(x => ({ ...x, [b.billId]: v })); } function reset() { setAccount(""); setCustomer(""); setValue(""); setManual({}); setMode("AUTO"); setReference(""); setRemarks(""); setSaved(null); void load(); } async function submit(e: React.FormEvent) { e.preventDefault(); setError(""); if (isReconnectionPayment && (!reconnectionOrder || reconnectionLoading || reconnectionError)) {
    setError(reconnectionError || "A pending reconnection order is required before payment can be saved.");
    return;
} if (!isReconnectionPayment && Math.abs(remaining) > .00001) {
    setError("The payment must be fully allocated before saving.");
    return;
} setSaving(true); try {
    const r = await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceAccountId: account, paymentTypeId: type, paymentMethodId: method, receiptTypeId: receiptType, amount: value, paymentDate: date, referenceNo: reference, remarks, allocationMethod: mode, allocations: Object.entries(allocations).filter(([, v]) => Number(v) > 0).map(([billId, amount]) => ({ billId, amount })) }) }), b = await r.json();
    if (!r.ok)
        throw new Error(b.message);
    setSaved({ ...b.data, account: selected ?? null });
    setValue("");
    setManual({});
    await load(customer, account);
}
catch (x) {
    setError(x instanceof Error ? x.message : "Unable to save payment.");
}
finally {
    setSaving(false);
} } return <TransactionShell><div className={styles.formShell}><Link className={styles.backLink} href="/transactions">? Back to Transactions</Link><div className={styles.headingRow}><div><div className={styles.eyebrow}>Transactions</div><h1 className={styles.title}>New Payment</h1><p className={styles.subtitle}>Record a customer payment and allocate it to outstanding bills.</p></div></div>{error && <div className={styles.notice}>{error}</div>}<form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))", gap: 18 }}><section className={`${styles.panel} ${styles.formPanel}`}><h2 className={styles.sectionTitle}>Customer &amp; Account Information</h2><div className={styles.accountPicker}><div><span className={styles.label}>Customer / Service Account</span><p className={styles.sectionDescription}>{selected ? "Selected service account" : "No service account selected."}</p></div><button type="button" className={styles.secondaryButton} onClick={openBrowser}>{selected ? "Change Account" : "Browse Account"}</button></div>{selected && <div className={styles.customerCard}><div className={styles.customerCardItem}><span>Customer</span><strong>{selected.customerName}</strong></div><div className={styles.customerCardItem}><span>Control No.</span><strong>{selected.controlNo}</strong></div><div className={styles.customerCardItem}><span>Address</span><strong>{selected.address || "—"}</strong></div><div className={styles.customerCardItem}><span>Connection Status</span><strong>{selected.status}</strong></div><div className={styles.customerCardItem}><span>Meter No.</span><strong>{selected.meterNo || "—"}</strong></div><div className={styles.customerCardItem}><span>Route</span><strong>{selected.routeCode || "—"}</strong></div></div>}<div className={styles.section}><h2 className={styles.sectionTitle}>Outstanding Bills</h2>{!account ? <p className={styles.sectionDescription}>Choose an account to load authoritative outstanding balances.</p> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Bill</th><th>Total / Breakdown</th><th>Paid</th><th>Outstanding</th></tr></thead><tbody>{bills.map(b => <tr key={b.billId}><td className={styles.strong}>{b.billNo}<div className={styles.muted}>{b.billDate} · Due {b.dueDate || "—"}</div></td><td>Total {money(b.totalAmountDue)}<div className={styles.muted}>Penalty {money(b.penaltyAmount)} · Approved adjustment {money(b.adjustmentAmount)}</div></td><td>{money(b.amountPaid)}</td><td className={styles.strong}>{money(b.outstanding)}</td></tr>)}{!loading && !bills.length && <tr><td colSpan={4}>No outstanding bills.</td></tr>}</tbody></table></div>}<div className={styles.muted} style={{ marginTop: 12 }}>Total outstanding selected bills: <strong>{money(totalOutstanding)}</strong><div className={styles.section}><h2 className={styles.sectionTitle}>Payment Allocation</h2><label className={styles.label}><input type="radio" checked={mode === "AUTO"} onChange={() => setMode("AUTO")}/> Automatic — Oldest Bill First</label><label className={styles.label}><input type="radio" checked={mode === "MANUAL"} onChange={() => setMode("MANUAL")}/> Manual Allocation</label><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Bill No.</th><th>Outstanding</th><th>Allocated</th></tr></thead><tbody>{bills.map(b => <tr key={b.billId}><td>{b.billNo}</td><td>{money(b.outstanding)}</td><td>{mode === "AUTO" ? <strong>{money(allocations[b.billId] || 0)}</strong> : <input className={styles.input} inputMode="decimal" value={allocations[b.billId] || ""} onChange={e => setAllocation(b, e.target.value)} placeholder="0.00"/>}</td></tr>)}</tbody></table></div></div></div></div></section><section className={`${styles.panel} ${styles.formPanel}`}><h2 className={styles.sectionTitle}>Payment Information</h2><div className={styles.fieldGrid}><label><span className={styles.label}>Payment Date *</span><input className={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} required/></label><label><span className={styles.label}>Payment Amount *</span><input className={styles.input} inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} placeholder="0.00" required disabled={isReconnectionPayment && Boolean(reconnectionOrder)}/></label>{isReconnectionPayment && <div className={styles.fullField}>{reconnectionLoading && <div className={styles.muted}>Loading reconnection fee...</div>}{reconnectionError && <div className={styles.fieldError}>{reconnectionError}</div>}{reconnectionOrder && <div className={styles.muted}>Reconnection Order: #{reconnectionOrder.reconnectionId} · Fee Amount: {money(reconnectionOrder.feeAmount)}</div>}</div>}<label><span className={styles.label}>Payment Type *</span><select className={styles.select} value={type} onChange={e => setType(e.target.value)} required><option value="">Select payment type</option>{data?.paymentTypes.map(x => <option key={x.paymentTypeId} value={x.paymentTypeId}>{x.name}</option>)}</select></label><label><span className={styles.label}>Payment Method *</span><select className={styles.select} value={method} onChange={e => setMethod(e.target.value)} required><option value="">Select payment method</option>{data?.paymentMethods.map(x => <option key={x.paymentMethodId} value={x.paymentMethodId}>{x.name}</option>)}</select></label><label><span className={styles.label}>Receipt Type</span><select className={styles.select} value={receiptType} onChange={e => setReceiptType(e.target.value)}><option value="">No receipt type</option>{data?.receiptTypes.map(x => <option key={x.receiptTypeId} value={x.receiptTypeId}>{x.name}</option>)}</select></label><label><span className={styles.label}>Reference No.</span><input className={styles.input} value={reference} onChange={e => setReference(e.target.value)}/></label><label className={styles.fullField}><span className={styles.label}>Remarks</span><textarea className={styles.textarea} value={remarks} onChange={e => setRemarks(e.target.value)}/></label></div><div className={styles.section}><h2 className={styles.sectionTitle}>Payment Summary</h2><div className={styles.detailItems}><div className={styles.detailItem}><span>Payment Amount</span><strong>{money(value)}</strong></div><div className={styles.detailItem}><span>Total Allocated</span><strong>{money(allocated)}</strong></div><div className={styles.detailItem}><span>Remaining / Unallocated</span><strong>{money(remaining)}</strong></div></div></div><div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={reset}>Cancel</button><button className={styles.button} disabled={saving || (!isReconnectionPayment && Math.abs(remaining) > .00001) || (isReconnectionPayment && (!reconnectionOrder || reconnectionLoading || Boolean(reconnectionError))) || !account}>{saving ? "Saving…" : "Save Payment"}</button></div></section></form>{browserOpen && <AccountBrowser search={browserSearch} setSearch={setBrowserSearch} searchAccounts={browseAccounts} rows={browserRows} selected={browserSelected} choose={setBrowserSelected} loading={browserLoading} error={browserError} close={() => setBrowserOpen(false)} confirm={chooseBrowsedAccount}/>} {saved && <SuccessModal data={saved} close={reset}/>}</div></TransactionShell>; }
type ReceiptOrganization = {
    name: string | null;
    officeName: string | null;
    address: string | null;
    tin: string | null;
    vatNo: string | null;
    contactNo: string | null;
    email: string | null;
    website: string | null;
    logoPath: string | null;
    footerNote: string | null;
};

const amountInWords = (value: string | number) => {
    const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
    const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
    const belowThousand = (number: number): string => {
        if (number < 20) return ones[number];
        if (number < 100) return `${tens[Math.floor(number / 10)]}${number % 10 ? `-${ones[number % 10]}` : ""}`;
        return `${ones[Math.floor(number / 100)]} HUNDRED${number % 100 ? ` ${belowThousand(number % 100)}` : ""}`;
    };
    const whole = Math.max(0, Math.floor(Number(value) || 0));
    const groups = [[1000000000, "BILLION"], [1000000, "MILLION"], [1000, "THOUSAND"]] as const;
    let remaining = whole;
    const words: string[] = [];
    for (const [size, label] of groups) {
        if (remaining >= size) {
            words.push(`${belowThousand(Math.floor(remaining / size))} ${label}`);
            remaining %= size;
        }
    }
    words.push(belowThousand(remaining) || "ZERO");
    const centavos = Math.round(((Number(value) || 0) - whole) * 100);
    return `${words.join(" ")} PESOS${centavos ? ` AND ${belowThousand(centavos)} CENTAVOS` : ""} ONLY`;
};

function SuccessModal({ data, close }: {
    data: Saved;
    close: () => void;
}) {
    const [receiptOrganization, setReceiptOrganization] = useState<ReceiptOrganization | null>(null);
    const [receiptOrgLoading, setReceiptOrgLoading] = useState(true);
    const [receiptOrgError, setReceiptOrgError] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        void (async () => {
            setReceiptOrgLoading(true);
            setReceiptOrgError("");
            try {
                const response = await fetch("/api/system-settings", { cache: "no-store", signal: controller.signal });
                const body = await response.json();
                if (!response.ok || !body?.success || !Array.isArray(body.data)) throw new Error(body?.message || "Organization settings could not be loaded.");
                const settings = new Map<string, string | null>(body.data.map((setting: { setting_key?: unknown; setting_value?: unknown }) => [String(setting.setting_key || ""), typeof setting.setting_value === "string" ? setting.setting_value : null]));
                const value = (key: string) => settings.get(key) || null;
                if (!controller.signal.aborted) setReceiptOrganization({ name: value("ORG_NAME"), officeName: value("OFFICE_NAME"), address: value("ORG_ADDRESS"), tin: value("ORG_TIN"), vatNo: value("ORG_VAT_NO"), contactNo: value("ORG_CONTACT_NO"), email: value("ORG_EMAIL"), website: value("ORG_WEBSITE"), logoPath: value("ORG_LOGO_PATH"), footerNote: value("REPORT_FOOTER_NOTE") });
            } catch (error) {
                if (!controller.signal.aborted) { setReceiptOrganization(null); setReceiptOrgError(error instanceof Error ? error.message : "Organization settings could not be loaded."); }
            } finally {
                if (!controller.signal.aborted) setReceiptOrgLoading(false);
            }
        })();
        return () => controller.abort();
    }, []);

    const account = data.account;
    const particular = data.paymentType.trim().toUpperCase() === "RECONNECTION" ? "Reconnection Fee" : data.paymentType || "Payment";
    const contacts = [receiptOrganization?.contactNo, receiptOrganization?.email, receiptOrganization?.website].filter(Boolean);
    const legacyFooter = "please present your official receipt at the bmws office for updating/recording.";
    const configuredFooter = receiptOrganization?.footerNote?.trim() || "";
    const showConfiguredFooter = configuredFooter.replace(/\s+/g, " ").toLowerCase() !== legacyFooter;
    const taxDetails = [receiptOrganization?.tin ? "TIN: " + receiptOrganization.tin : "", receiptOrganization?.vatNo ? "VAT No.: " + receiptOrganization.vatNo : ""].filter(Boolean).join(" ? ");

    return (
        <div className={styles.dialogBackdrop}>
            <div className={[styles.dialog, styles.paymentSuccessDialog].join(" ")} role="dialog" aria-modal="true">
                <div className={styles.paymentSuccessScreen}>
                    <h2>Payment Successful</h2>
                    <p>Payment recorded successfully.</p>
                    <div className={styles.detailItems}>
                        <div className={styles.detailItem}><span>Receipt No.</span><strong>{data.receiptNo}</strong></div>
                        <div className={styles.detailItem}><span>Amount</span><strong>{money(data.paymentAmount)}</strong></div>
                    </div>
                </div>
                <div id="payment-print" className={styles.paymentReceipt} data-organization-loading={receiptOrgLoading ? "true" : "false"} data-organization-error={receiptOrgError ? "true" : "false"}>
                    <header className={styles.paymentReceiptHeader}>
                        {receiptOrganization?.logoPath && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className={styles.paymentReceiptLogo} src={receiptOrganization.logoPath} alt="" />
                        )}
                        <div className={styles.paymentReceiptOrganization}>
                            {receiptOrganization?.name && <strong>{receiptOrganization.name}</strong>}
                            {receiptOrganization?.officeName && <span>{receiptOrganization.officeName}</span>}
                            {receiptOrganization?.address && <span>{receiptOrganization.address}</span>}
                            {contacts.length > 0 && <span>{contacts.join(" ? ")}</span>}
                            {taxDetails && <span>{taxDetails}</span>}
                        </div>
                        <div className={styles.paymentReceiptMeta}>
                            <strong>PAYMENT RECEIPT</strong><span>Receipt No.: {data.receiptNo}</span><span>Receipt Date: {data.paymentDate}</span><span>Payment Date: {data.paymentDate}</span>
                        </div>
                    </header>
                    <h2 className={styles.paymentReceiptTitle}>PAYMENT RECEIPT</h2>
                    <div className={styles.paymentReceiptInfoGrid}>
                        <section className={styles.paymentReceiptSection}><h3>CUSTOMER INFORMATION</h3><div><span>Customer Name</span><strong>{data.customerName || "-"}</strong></div><div><span>Service Address</span><strong>{account?.address || "-"}</strong></div></section>
                        <section className={styles.paymentReceiptSection}><h3>ACCOUNT INFORMATION</h3><div><span>Control No.</span><strong>{data.controlNo || "-"}</strong></div><div><span>Meter No.</span><strong>{account?.meterNo || "-"}</strong></div><div><span>Route</span><strong>{account?.routeCode || "-"}</strong></div><div><span>Connection Status</span><strong>{account?.status || "-"}</strong></div></section>
                    </div>
                    <section className={styles.paymentReceiptSection}><h3>PAYMENT DETAILS</h3><div className={styles.paymentReceiptDetails}><span>Payment Type</span><strong>{data.paymentType || "-"}</strong><span>Payment Method</span><strong>{data.paymentMethod || "-"}</strong><span>Reference No.</span><strong>{data.referenceNo || "-"}</strong></div></section>
                    <section className={styles.paymentReceiptParticulars}><table><thead><tr><th>PARTICULARS</th><th>AMOUNT</th></tr></thead><tbody><tr><td>{particular}</td><td>{money(data.paymentAmount)}</td></tr></tbody></table><div className={styles.paymentReceiptTotal}><span>TOTAL AMOUNT PAID</span><strong>{money(data.paymentAmount)}</strong></div><p><strong>Amount in Words:</strong> {amountInWords(data.paymentAmount)}</p></section>
                    {data.allocations.length > 0 && <section className={styles.paymentReceiptSection}><h3>ALLOCATED BILLS</h3><table className={styles.paymentReceiptAllocations}><thead><tr><th>Bill No.</th><th>Bill Date</th><th>Amount Allocated</th><th>Status</th></tr></thead><tbody>{data.allocations.map((allocation) => <tr key={allocation.billNo}><td>{allocation.billNo}</td><td>{allocation.billDate}</td><td>{money(allocation.amount)}</td><td>{allocation.resultingStatus}</td></tr>)}</tbody></table></section>}
                    <div className={styles.paymentReceiptStatus}><span>Payment Status</span><strong>POSTED</strong><span>Reference No.</span><strong>{data.referenceNo || "-"}</strong></div>
                    <footer className={styles.paymentReceiptFooter}>
                        {configuredFooter && showConfiguredFooter && <p>{configuredFooter}</p>}
                        <p className={styles.paymentReceiptThankYou}>Thank you for your payment. This serves as your official receipt.</p>
                        <div><span>____________________________</span><strong>Cashier / Receiving Officer</strong></div>
                    </footer>
                </div>
                <div className={[styles.dialogActions, styles.paymentSuccessActions].join(" ")}><button type="button" className={styles.secondaryButton} onClick={() => window.print()}>Print Summary</button><button type="button" className={styles.button} onClick={close}>New Payment</button></div>
            </div>
        </div>
    );
}
function AccountBrowser(p: {
    search: string;
    setSearch: (v: string) => void;
    searchAccounts: () => void;
    rows: Account[];
    selected: Account | null;
    choose: (a: Account) => void;
    loading: boolean;
    error: string;
    close: () => void;
    confirm: () => void;
}) { return <div className={styles.dialogBackdrop}><div className={styles.accountBrowseDialog} role="dialog" aria-modal="true"><div className={styles.dialogHeader}><h2>Select Customer / Service Account</h2><button type="button" className={styles.dialogClose} onClick={p.close}>×</button></div><form className={styles.accountBrowseSearch} onSubmit={e => { e.preventDefault(); p.searchAccounts(); }}><input className={styles.input} value={p.search} onChange={e => p.setSearch(e.target.value)} placeholder="Control no., customer, meter no., or address" autoFocus/><button className={styles.button}>Search</button></form><div className={styles.accountBrowseTableWrap}><table className={styles.table}><thead><tr><th>Control No.</th><th>Customer</th><th>Address</th><th>Meter No.</th><th>Status</th><th>Route</th></tr></thead><tbody>{p.rows.map(a => <tr key={a.serviceAccountId} className={p.selected?.serviceAccountId === a.serviceAccountId ? styles.selectedRow : styles.selectableRow} onClick={() => p.choose(a)}><td>{a.controlNo}</td><td>{a.customerName}</td><td>{a.address || "—"}</td><td>{a.meterNo || "—"}</td><td>{a.status}</td><td>{a.routeCode || "—"}</td></tr>)}{p.loading && <tr><td colSpan={6}>Loading service accounts...</td></tr>}{!p.loading && !p.error && !p.rows.length && <tr><td colSpan={6}>No service accounts found.</td></tr>}{p.error && <tr><td colSpan={6}>{p.error}</td></tr>}</tbody></table></div><div className={styles.dialogActions}><button type="button" className={styles.secondaryButton} onClick={p.close}>Cancel</button><button type="button" className={styles.button} disabled={!p.selected} onClick={p.confirm}>Select Account</button></div></div></div>; }
