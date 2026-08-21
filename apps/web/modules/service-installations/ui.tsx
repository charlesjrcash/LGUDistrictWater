"use client";
import { useCallback, useEffect, useState } from "react";
import { TransactionShell } from "@/modules/transactions/ui/transaction-shell";
import styles from "@/modules/transactions/ui/transactions.module.css";
const statuses = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
type Status = (typeof statuses)[number];
type Row = {
    installationId: string;
    serviceAccountId: string;
    controlNo: string;
    customerName: string;
    address: string | null;
    connectionStatus: string;
    scheduledDate: string | null;
    installationDate: string | null;
    meterId: string | null;
    meterNo: string | null;
    inspectorId: string | null;
    inspectorName: string | null;
    installerId: string | null;
    installerName: string | null;
    status: Status;
    remarks: string | null;
};
type Account = {
    serviceAccountId: string;
    controlNo: string;
    customerName: string;
    address: string | null;
    status: string;
    meterNo: string;
};
type Options = {
    employees: {
        id: string;
        name: string;
    }[];
    meters: {
        id: string;
        meterNo: string;
        meterSize: string;
        status: string;
    }[];
};
type Form = {
    serviceAccountId: string;
    scheduledDate: string;
    installationDate: string;
    meterId: string;
    inspectorId: string;
    installerId: string;
    installationStatus: Status;
    remarks: string;
};
type ReportData = {
    installationId: string;
    controlNo: string | null;
    customerName: string | null;
    address: string | null;
    classification: string | null;
    connectionStatus: string | null;
    scheduledDate: string | null;
    installationDate: string | null;
    status: Status;
    remarks: string | null;
    meterNo: string | null;
    meterSize: string | null;
    meterStatus: string | null;
    inspector: string | null;
    installer: string | null;
    preparedBy: string | null;
    createdAt: string | null;
    updatedBy: string | null;
    updatedAt: string | null;
    organization?: {
        name?: string | null;
        officeName?: string | null;
        address?: string | null;
        tin?: string | null;
        vatNo?: string | null;
        contactNo?: string | null;
        email?: string | null;
        website?: string | null;
        logoPath?: string | null;
        footerNote?: string | null;
    } | null;
};
type ActivationResult = {
    installationDate: string;
    serviceStatus: string;
    meterStatus: string;
    meterInstallationCreated: boolean;
    alreadyActivated: boolean;
};
const blank = (): Form => ({ serviceAccountId: "", scheduledDate: "", installationDate: "", meterId: "", inspectorId: "", installerId: "", installationStatus: "SCHEDULED", remarks: "" });
const date = (value: string | null) => value ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`)) : "—";
const badge = (value: Status) => `${styles.badge} ${value === "COMPLETED" ? styles.approved : value === "CANCELLED" ? styles.neutral : styles.pending}`;
export function ServiceInstallationsPage({ canCreate, canEdit }: {
    canCreate: boolean;
    canEdit: boolean;
}) {
    const [rows, setRows] = useState<Row[]>([]), [search, setSearch] = useState(""), [status, setStatus] = useState(""), [loading, setLoading] = useState(true), [error, setError] = useState("");
    const [editing, setEditing] = useState<Row | null>(null), [createOpen, setCreateOpen] = useState(false);
    const [reportInstallationId, setReportInstallationId] = useState<string | null>(null);
    const [reportOpen, setReportOpen] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportError, setReportError] = useState("");
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [activationInstallation, setActivationInstallation] = useState<Row | null>(null);
    const [activationLoading, setActivationLoading] = useState(false);
    const [activationError, setActivationError] = useState("");
    const [activationResult, setActivationResult] = useState<ActivationResult | null>(null);
    const closeReport = () => {
        setReportOpen(false);
        setReportInstallationId(null);
        setReportData(null);
        setReportError("");
        setReportLoading(false);
    };
    const closeActivation = () => {
        setActivationInstallation(null);
        setActivationLoading(false);
        setActivationError("");
        setActivationResult(null);
    };
    const activateService = async () => {
        if (!activationInstallation || activationLoading)
            return;
        setActivationLoading(true);
        setActivationError("");
        try {
            const response = await fetch(`/api/service-installations/${activationInstallation.installationId}/activate`, { method: "POST" });
            const body = await response.json();
            if (!response.ok)
                throw new Error(body.message || "Unable to activate service.");
            setActivationResult(body.data);
            await load();
        }
        catch (caught) {
            setActivationError(caught instanceof Error ? caught.message : "Unable to activate service.");
        }
        finally {
            setActivationLoading(false);
        }
    };
    const load = useCallback(async () => { setLoading(true); setError(""); try {
        const params = new URLSearchParams();
        if (search)
            params.set("search", search);
        if (status)
            params.set("status", status);
        const response = await fetch(`/api/service-installations?${params}`, { cache: "no-store" });
        const body = await response.json();
        if (!response.ok)
            throw new Error(body.message);
        setRows(body.data);
    }
    catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load service installations.");
    }
    finally {
        setLoading(false);
    } }, [search, status]);
    useEffect(() => { const timer = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timer); }, [load]);
    useEffect(() => {
        if (!reportOpen || !reportInstallationId)
            return;
        const controller = new AbortController();
        void (async () => {
            try {
                const response = await fetch(`/api/service-installations/${reportInstallationId}`, {
                    cache: "no-store",
                    signal: controller.signal,
                });
                const body = await response.json();
                if (!response.ok)
                    throw new Error(body.message || "Unable to load service installation report.");
                if (!controller.signal.aborted)
                    setReportData(body.data);
            }
            catch (caught) {
                if (!controller.signal.aborted)
                    setReportError(caught instanceof Error ? caught.message : "Unable to load service installation report.");
            }
            finally {
                if (!controller.signal.aborted)
                    setReportLoading(false);
            }
        })();
        return () => controller.abort();
    }, [reportInstallationId, reportOpen]);
    return <TransactionShell active="service-installations"><div className={styles.headingRow}><div><div className={styles.eyebrow}>Transactions</div><h1 className={styles.title}>Service Installations</h1><p className={styles.subtitle}>Schedule, assign, and preserve water service installation records.</p></div>{canCreate && <button className={styles.button} onClick={() => setCreateOpen(true)}>＋ New Installation</button>}</div><section className={styles.panel}><div className={styles.filters}><input className={styles.input} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search control no., customer, or meter no."/><select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></div>{loading ? <div className={styles.loading}>Loading service installations…</div> : error ? <div className={styles.errorState}><h2>We couldn&apos;t load service installations</h2><p>{error}</p><button className={styles.secondaryButton} onClick={() => void load()}>Try again</button></div> : !rows.length ? <div className={styles.empty}><h2>No service installations found.</h2><p>Try a different search or create a new installation.</p></div> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr>{["Installation ID", "Control No.", "Customer", "Scheduled Date", "Installation Date", "Meter No.", "Inspector", "Installer", "Status", "Remarks", "Actions"].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.installationId}><td>{row.installationId}</td><td>{row.controlNo}</td><td>{row.customerName}</td><td>{date(row.scheduledDate)}</td><td>{date(row.installationDate)}</td><td>{row.meterNo || "—"}</td><td>{row.inspectorName || "—"}</td><td>{row.installerName || "—"}</td><td><span className={badge(row.status)}>{row.status}</span></td><td>{row.remarks || "—"}</td><td><div className={styles.actionStack}>{canEdit ? <button className={styles.secondaryButton} onClick={() => setEditing(row)}>View / Edit</button> : "View only"}<button type="button" className={styles.secondaryButton} onClick={() => { setReportInstallationId(row.installationId); setReportData(null); setReportError(""); setReportLoading(true); setReportOpen(true); }}>Preview Report</button>{canEdit && row.status === "COMPLETED" && <button type="button" className={styles.button} onClick={() => { setActivationInstallation(row); setActivationError(""); setActivationResult(null); }}>Activate Service</button>}</div></td></tr>)}</tbody></table></div>}</section>{createOpen && <InstallationDialog onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); void load(); }}/>}{editing && <InstallationDialog row={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }}/>}{reportOpen && reportInstallationId && <ReportModal installationId={reportInstallationId} loading={reportLoading} error={reportError} data={reportData} onClose={closeReport}/>}{activationInstallation && <ActivationModal installation={activationInstallation} loading={activationLoading} error={activationError} result={activationResult} onCancel={closeActivation} onActivate={() => void activateService()}/>}</TransactionShell>;
}
function InstallationDialog({ row, onClose, onSaved }: {
    row?: Row;
    onClose: () => void;
    onSaved: () => void;
}) {
    const editing = Boolean(row), completed = row?.status === "COMPLETED";
    const [form, setForm] = useState<Form>(() => row ? { serviceAccountId: row.serviceAccountId, scheduledDate: row.scheduledDate?.slice(0, 10) || "", installationDate: row.installationDate?.slice(0, 10) || "", meterId: row.meterId || "", inspectorId: row.inspectorId || "", installerId: row.installerId || "", installationStatus: row.status, remarks: row.remarks || "" } : blank());
    const [account, setAccount] = useState<Account | null>(row ? { serviceAccountId: row.serviceAccountId, controlNo: row.controlNo, customerName: row.customerName, address: row.address, status: row.connectionStatus, meterNo: row.meterNo || "—" } : null), [options, setOptions] = useState<Options>({ employees: [], meters: [] }), [browse, setBrowse] = useState(false), [errors, setErrors] = useState<Record<string, string>>({}), [error, setError] = useState(""), [saving, setSaving] = useState(false);
    useEffect(() => { let cancelled = false; async function loadOptions() { try {
        const params = new URLSearchParams();
        if (form.serviceAccountId)
            params.set("serviceAccountId", form.serviceAccountId);
        if (row?.installationId)
            params.set("installationId", row.installationId);
        const response = await fetch(`/api/service-installations/options?${params}`, { cache: "no-store" });
        const body = await response.json();
        if (!response.ok)
            throw new Error(body.message);
        if (!cancelled)
            setOptions(body.data);
    }
    catch (caught) {
        if (!cancelled)
            setError(caught instanceof Error ? caught.message : "Unable to load installation options.");
    } } void loadOptions(); return () => { cancelled = true; }; }, [form.serviceAccountId, row?.installationId]);
    const update = (key: keyof Form, value: string) => { setForm((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: "" })); };
    const chooseAccount = (selected: Account) => { setAccount(selected); setForm((current) => ({ ...current, serviceAccountId: selected.serviceAccountId, meterId: "" })); setBrowse(false); };
    async function save(event: React.FormEvent) { event.preventDefault(); setSaving(true); setError(""); try {
        const response = await fetch(editing ? `/api/service-installations/${row!.installationId}` : "/api/service-installations", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const body = await response.json();
        if (!response.ok) {
            setErrors(body.errors || {});
            throw new Error(body.message);
        }
        onSaved();
    }
    catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to save the service installation.");
    }
    finally {
        setSaving(false);
    } }
    return <div className={styles.dialogBackdrop}><div className={`${styles.dialog} ${styles.serviceInstallationDialog}`} role="dialog" aria-modal="true" aria-label={editing ? "Edit service installation" : "New service installation"}><div className={styles.dialogHeader}><div><h2>{editing ? `Service Installation #${row!.installationId}` : "New Service Installation"}</h2><p>{completed ? "Completed installation: core installation fields are protected." : "Fields marked with an asterisk are required."}</p></div><button type="button" className={styles.dialogClose} onClick={onClose} aria-label="Close">×</button></div><form onSubmit={save}>{error && <div className={styles.notice}>{error}</div>}<section className={styles.section}><h2 className={styles.sectionTitle}>Service Account</h2>{account ? <div className={styles.detailItems}><div className={styles.detailItem}><span>Control No.</span><strong>{account.controlNo}</strong></div><div className={styles.detailItem}><span>Customer</span><strong>{account.customerName}</strong></div><div className={styles.detailItem}><span>Service Address</span><strong>{account.address || "—"}</strong></div><div className={styles.detailItem}><span>Meter No.</span><strong>{account.meterNo || "—"}</strong></div><div className={styles.detailItem}><span>Connection Status</span><strong>{account.status || "—"}</strong></div></div> : <p>No service account selected.</p>}{!editing && <button type="button" className={styles.secondaryButton} onClick={() => setBrowse(true)}>Browse Service Accounts</button>}{errors.serviceAccountId && <div className={styles.fieldError}>{errors.serviceAccountId}</div>}</section><section className={styles.section}><div className={styles.fieldGrid}><Field label="Scheduled Date" type="date" value={form.scheduledDate} onChange={(value) => update("scheduledDate", value)} error={errors.scheduledDate}/><Field label="Installation Date" type="date" value={form.installationDate} disabled={completed} onChange={(value) => update("installationDate", value)} error={errors.installationDate}/><Select label="Meter" value={form.meterId} disabled={completed || !form.serviceAccountId} onChange={(value) => update("meterId", value)} error={errors.meterId} options={options.meters.map((meter) => ({ id: meter.id, label: `${meter.meterNo} — ${meter.meterSize} (${meter.status})` }))}/><Select label="Status" value={form.installationStatus} disabled={completed} onChange={(value) => update("installationStatus", value)} error={errors.installationStatus} options={statuses.map((item) => ({ id: item, label: item }))}/><Select label="Inspector" value={form.inspectorId} onChange={(value) => update("inspectorId", value)} error={errors.inspectorId} options={options.employees.map((employee) => ({ id: employee.id, label: employee.name }))}/><Select label="Installer" value={form.installerId} onChange={(value) => update("installerId", value)} error={errors.installerId} options={options.employees.map((employee) => ({ id: employee.id, label: employee.name }))}/><div className={styles.fullField}><label className={styles.label}>Remarks</label><textarea className={styles.textarea} value={form.remarks} onChange={(event) => update("remarks", event.target.value)}/></div></div></section><div className={styles.dialogActions}><button type="button" className={styles.secondaryButton} onClick={onClose} disabled={saving}>Close</button><button className={styles.button} disabled={saving || (!editing && !form.serviceAccountId)}>{saving ? "Saving…" : "Save Installation"}</button></div></form>{browse && <AccountBrowser onClose={() => setBrowse(false)} onChoose={chooseAccount}/>}</div></div>;
}

function ReportModal({ installationId, loading, error, data, onClose }: {
    installationId: string;
    loading: boolean;
    error: string;
    data: ReportData | null;
    onClose: () => void;
}) {
    return (
        <div className={styles.dialogBackdrop} role="presentation">
            <div
                className={`${styles.dialog} ${styles.serviceInstallationDialog} ${styles.serviceInstallationReportDialog}`}
                role="dialog"
                aria-modal="true"
                aria-label="Service Installation Report"
            >
                <h2>Service Installation Report</h2>
                {loading ? <p>Loading service installation report...</p> : error ? <p className={styles.fieldError}>{error}</p> : data ? <ReportHeader data={data}/> : <p>Installation ID: <strong>{installationId}</strong></p>}
                <div className={styles.dialogActions}>
                    <button type="button" className={styles.secondaryButton} onClick={onClose}>
                        Close
                    </button>
                    <button type="button" className={styles.button} onClick={() => window.print()}>
                        Print Report
                    </button>
                </div>
            </div>
        </div>
    );
}

function ActivationModal({ installation, loading, error, result, onCancel, onActivate }: {
    installation: Row;
    loading: boolean;
    error: string;
    result: ActivationResult | null;
    onCancel: () => void;
    onActivate: () => void;
}) {
    return <div className={styles.dialogBackdrop} role="presentation"><div className={`${styles.dialog} ${styles.serviceInstallationDialog}`} role="dialog" aria-modal="true" aria-label="Activate Service"><h2>{result ? "Service Activated Successfully" : "Activate Service"}</h2>{result ? <><div className={styles.detailItems}><div className={styles.detailItem}><span>Service Account Status</span><strong>{result.serviceStatus}</strong></div><div className={styles.detailItem}><span>Meter Status</span><strong>{result.meterStatus}</strong></div><div className={styles.detailItem}><span>Installation Date</span><strong>{date(result.installationDate)}</strong></div><div className={styles.detailItem}><span>Meter Installation History</span><strong>{result.meterInstallationCreated ? "Created" : "Not created"}</strong></div></div>{result.alreadyActivated && <p className={styles.notice}>This service was already activated. No duplicate meter installation history was created.</p>}</> : <><div className={styles.detailItems}>{[["Installation ID", installation.installationId], ["Control No.", installation.controlNo], ["Customer", installation.customerName], ["Meter No.", installation.meterNo || "—"], ["Installation Date", date(installation.installationDate)]].map(([label, value]) => <div className={styles.detailItem} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><p>This will activate the service account, activate the installed meter, and create the initial meter installation history.</p>{error && <p className={styles.fieldError}>{error}</p>}</>}<div className={styles.dialogActions}><button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={loading}>{result ? "Close" : "Cancel"}</button>{!result && <button type="button" className={styles.button} onClick={onActivate} disabled={loading}>{loading ? "Activating..." : "Activate Service"}</button>}</div></div></div>;
}

function ReportHeader({ data }: { data: ReportData }) {
    const organization = data.organization;
    const contacts = [["TIN", organization?.tin], ["VAT No.", organization?.vatNo], ["Contact", organization?.contactNo], ["Email", organization?.email], ["Website", organization?.website]].filter(([, value]) => Boolean(value));
    return <div id="service-installation-print" className={styles.reportContent}>
        {organization && <header className={styles.organizationHeader}>{organization.logoPath && <img className={styles.organizationLogo} src={organization.logoPath} alt=""/>}<div className={styles.organizationText}>{organization.name && <strong className={styles.organizationName}>{organization.name}</strong>}{organization.officeName && <span>{organization.officeName}</span>}{organization.address && <span>{organization.address}</span>}{contacts.length > 0 && <div className={styles.organizationContacts}>{contacts.map(([label, value]) => <span key={label}>{label}: {value}</span>)}</div>}</div></header>}
        <h3 className={styles.sectionTitle}>SERVICE INSTALLATION REPORT</h3>
        <div className={styles.detailItems}><div className={styles.detailItem}><span>Installation ID</span><strong>{data.installationId || "-"}</strong></div></div>
        <section className={styles.section}><h3 className={styles.sectionTitle}>SERVICE ACCOUNT INFORMATION</h3><div className={styles.detailItems}>{[["Control No.", data.controlNo], ["Customer Name", data.customerName], ["Service Address", data.address], ["Classification", data.classification], ["Connection Status", data.connectionStatus]].map(([label, value]) => <div className={styles.detailItem} key={label}><span>{label}</span><strong>{value || "-"}</strong></div>)}</div></section>
        <section className={styles.section}><h3 className={styles.sectionTitle}>INSTALLATION DETAILS</h3><div className={styles.detailItems}><div className={styles.detailItem}><span>Scheduled Date</span><strong>{date(data.scheduledDate)}</strong></div><div className={styles.detailItem}><span>Installation Date</span><strong>{date(data.installationDate)}</strong></div><div className={styles.detailItem}><span>Installation Status</span><strong><span className={badge(data.status)}>{data.status || "-"}</span></strong></div><div className={`${styles.detailItem} ${styles.fullField}`}><span>Remarks</span><strong>{data.remarks || "-"}</strong></div></div></section>
        <section className={styles.section}><h3 className={styles.sectionTitle}>METER INFORMATION</h3><div className={styles.detailItems}>{[["Meter No.", data.meterNo], ["Meter Size", data.meterSize], ["Meter Status", data.meterStatus]].map(([label, value]) => <div className={styles.detailItem} key={label}><span>{label}</span><strong>{value || "-"}</strong></div>)}</div></section>
        <section className={styles.section}><h3 className={styles.sectionTitle}>PERSONNEL</h3><div className={styles.detailItems}>{[["Inspector", data.inspector], ["Installer", data.installer]].map(([label, value]) => <div className={styles.detailItem} key={label}><span>{label}</span><strong>{value || "-"}</strong></div>)}</div></section>
        <section className={styles.section}><h3 className={styles.sectionTitle}>REPORT / AUDIT INFORMATION</h3><div className={styles.detailItems}><div className={styles.detailItem}><span>Prepared By</span><strong>{data.preparedBy || "-"}</strong></div><div className={styles.detailItem}><span>Created Date</span><strong>{date(data.createdAt)}</strong></div><div className={styles.detailItem}><span>Updated By</span><strong>{data.updatedBy || "-"}</strong></div><div className={styles.detailItem}><span>Updated Date</span><strong>{date(data.updatedAt)}</strong></div></div></section>
        {organization?.footerNote && <p className={styles.organizationFooterNote}>{organization.footerNote}</p>}
    </div>;
}

function Field({ label, value, onChange, type, error, disabled }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    error?: string;
    disabled?: boolean;
}) { return <div><label className={styles.label}>{label}</label><input className={styles.input} type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}/>{error && <div className={styles.fieldError}>{error}</div>}</div>; }
function Select({ label, value, onChange, options, error, disabled }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: {
        id: string;
        label: string;
    }[];
    error?: string;
    disabled?: boolean;
}) { return <div><label className={styles.label}>{label}</label><select className={styles.select} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}><option value="">Select {label.toLowerCase()}</option>{options.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>{error && <div className={styles.fieldError}>{error}</div>}</div>; }
function AccountBrowser({ onClose, onChoose }: {
    onClose: () => void;
    onChoose: (account: Account) => void;
}) {
    const [search, setSearch] = useState(""), [rows, setRows] = useState<Account[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
    const load = async (term = search) => { setLoading(true); setError(""); try {
        const response = await fetch(`/api/service-installations/accounts?search=${encodeURIComponent(term)}`, { cache: "no-store" });
        const body = await response.json();
        if (!response.ok)
            throw new Error(body.message);
        setRows(body.data);
    }
    catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load accounts.");
    }
    finally {
        setLoading(false);
    } };
    useEffect(() => { void fetch("/api/service-installations/accounts", { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok)
        throw new Error(body.message); setRows(body.data); }).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load accounts.")).finally(() => setLoading(false)); }, []);
    return <div className={styles.dialogBackdrop}><div className={styles.accountBrowseDialog} role="dialog" aria-modal="true"><div className={styles.dialogHeader}><h2>Select Service Account</h2><button className={styles.dialogClose} onClick={onClose}>×</button></div><form className={styles.accountBrowseSearch} onSubmit={(event) => { event.preventDefault(); void load(); }}><input className={styles.input} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Control no., customer, meter no., or address" autoFocus/><button className={styles.button}>Search</button></form>{error && <div className={styles.notice}>{error}</div>}<div className={styles.accountBrowseTableWrap}><table className={styles.table}><thead><tr><th>Control No.</th><th>Customer</th><th>Address</th><th>Meter No.</th><th>Status</th><th></th></tr></thead><tbody>{rows.map((account) => <tr key={account.serviceAccountId}><td>{account.controlNo}</td><td>{account.customerName}</td><td>{account.address || "—"}</td><td>{account.meterNo}</td><td>{account.status}</td><td><button type="button" className={styles.secondaryButton} onClick={() => onChoose(account)}>Select</button></td></tr>)}{loading && <tr><td colSpan={6}>Loading service accounts…</td></tr>}{!loading && !rows.length && <tr><td colSpan={6}>No service accounts found.</td></tr>}</tbody></table></div></div></div>;
}
