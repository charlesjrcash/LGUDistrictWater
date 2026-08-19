"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReferenceOption } from "@/modules/service-applications/types";
import type { CreateAccountContext } from "@/modules/service-accounts/types";
import { ApplicationStatusBadge } from "@/modules/service-applications/ui/application-status-badge";
import { TransactionShell } from "@/modules/transactions/ui/transaction-shell";
import styles from "@/modules/transactions/ui/transactions.module.css";

<<<<<<< HEAD
export function CreateAccountForm({ applicationNo }: { applicationNo: string }) {
  const router = useRouter(); const [context,setContext]=useState<CreateAccountContext|null>(null); const [classifications,setClassifications]=useState<ReferenceOption[]>([]); const [connectionTypes,setConnectionTypes]=useState<ReferenceOption[]>([]); const [serviceTypes,setServiceTypes]=useState<ReferenceOption[]>([]); const [routes,setRoutes]=useState<ReferenceOption[]>([]); const [classificationCode,setClassificationCode]=useState(""); const [connectionTypeCode,setConnectionTypeCode]=useState(""); const [serviceTypeCode,setServiceTypeCode]=useState(""); const [routeCode,setRouteCode]=useState(""); const [dateConnected,setDateConnected]=useState(""); const [address,setAddress]=useState(""); const [loading,setLoading]=useState(true); const [submitting,setSubmitting]=useState(false); const [error,setError]=useState(""); const [fieldErrors,setFieldErrors]=useState<Record<string,string>>({});
  useEffect(()=>{let cancelled=false;async function load(){try{const [contextResponse,optionsResponse]=await Promise.all([fetch(`/api/service-accounts/from-application/${encodeURIComponent(applicationNo)}`,{cache:"no-store"}),fetch("/api/service-accounts/options")]);const [contextBody,optionsBody]=await Promise.all([contextResponse.json(),optionsResponse.json()]);if(!contextResponse.ok)throw new Error(contextBody.message);if(!optionsResponse.ok)throw new Error(optionsBody.message);if(!cancelled){setContext(contextBody.data);setClassifications(optionsBody.data.classifications);setConnectionTypes(optionsBody.data.connectionTypes);setServiceTypes(optionsBody.data.serviceTypes);setRoutes(optionsBody.data.readingRoutes);setAddress(contextBody.data.customer.address||"");}}catch(loadError){if(!cancelled)setError(loadError instanceof Error?loadError.message:"Unable to load the approved application.");}finally{if(!cancelled)setLoading(false);}}void load();return()=>{cancelled=true;};},[applicationNo]);
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(submitting)return;const errors:Record<string,string>={};if(!classificationCode)errors.classificationCode="Select a classification.";if(!connectionTypeCode)errors.connectionTypeCode="Select a connection type.";setFieldErrors(errors);if(Object.keys(errors).length)return;setSubmitting(true);setError("");try{const response=await fetch(`/api/service-accounts/from-application/${encodeURIComponent(applicationNo)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({classificationCode,connectionTypeCode,serviceTypeCode,routeCode,dateConnected,address})});const body=await response.json();if(!response.ok){setFieldErrors(body.errors||{});throw new Error(body.message||"Unable to create the service account.");}router.push(`/service-accounts/${encodeURIComponent(body.data.controlNo)}?created=1`);}catch(submitError){setError(submitError instanceof Error?submitError.message:"Unable to create the service account.");setSubmitting(false);}}
  const approved=context?`${context.application.statusCode} ${context.application.status}`.toUpperCase().includes("APPROV"):false;
  return <ModuleShell active="service-accounts"><div className={styles.formShell}><Link href={`/service-applications/${encodeURIComponent(applicationNo)}`} className={styles.backLink}>← {applicationNo}</Link><div className={styles.headingRow}><div><div className={styles.eyebrow}>Service Accounts</div><h1 className={styles.title}>Create Service Account</h1><p className={styles.subtitle}>Create a service account from this approved application.</p></div></div><form className={`${styles.panel} ${styles.formPanel}`} onSubmit={submit}>{error&&<div className={styles.notice}>{error}</div>}{loading?<div className={styles.loading}><div className={styles.skeleton} style={{height:150}}/></div>:context&&<><section className={styles.section}><div className={styles.cardHeading}><div><h2 className={styles.sectionTitle}>Application Reference</h2><p className={styles.sectionDescription}>Application and customer are linked automatically.</p></div><ApplicationStatusBadge code={context.application.statusCode} name={context.application.status}/></div><div className={styles.customerCard}>{[["Application No.",context.application.applicationNo],["Customer No.",context.customer.customerNo],["Customer",context.customer.name],["Customer Address",context.customer.address||"—"]].map(([label,value])=><div className={styles.customerCardItem} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>{!approved&&<div className={styles.notice}>Only approved applications can create a service account.</div>}{context.existingControlNo&&<div className={styles.successNotice}>Service account already exists: <Link className={styles.viewLink} href={`/service-accounts/${encodeURIComponent(context.existingControlNo)}`}>{context.existingControlNo}</Link></div>}</section><section className={styles.section}><h2 className={styles.sectionTitle}>Service Account Information</h2><p className={styles.sectionDescription}>Control number is generated and the initial connection status is Active.</p><div className={styles.fieldGrid}><div><label className={styles.label}>Control No.</label><input className={styles.input} value="Generated automatically" disabled/></div><div><label className={styles.label}>Connection Status</label><input className={styles.input} value="Active" disabled/></div><Select label="Classification" value={classificationCode} onChange={setClassificationCode} options={classifications} required error={fieldErrors.classificationCode}/><Select label="Connection Type" value={connectionTypeCode} onChange={setConnectionTypeCode} options={connectionTypes} required error={fieldErrors.connectionTypeCode}/><Select label="Service Type" value={serviceTypeCode} onChange={setServiceTypeCode} options={serviceTypes}/><Select label="Reading Route" value={routeCode} onChange={setRouteCode} options={routes}/><div><label className={styles.label}>Date Connected</label><input type="date" className={styles.input} value={dateConnected} onChange={(event)=>setDateConnected(event.target.value)}/>{fieldErrors.dateConnected&&<div className={styles.fieldError}>{fieldErrors.dateConnected}</div>}</div><div className={styles.fullField}><label className={styles.label}>Service Address</label><textarea className={styles.textarea} value={address} onChange={(event)=>setAddress(event.target.value)} maxLength={4000}/></div></div></section><div className={styles.formActions}><Link className={styles.secondaryButton} href={`/service-applications/${encodeURIComponent(applicationNo)}`}>Cancel</Link><button className={styles.button} disabled={submitting||!approved||Boolean(context.existingControlNo)}>{submitting?"Creating…":"Create Service Account"}</button></div></>}</form></div></ModuleShell>;
=======
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function CreateAccountForm({
  applicationNo,
}: {
  applicationNo: string;
}) {
  const router = useRouter();
  const [context, setContext] = useState<CreateAccountContext | null>(null);
  const [classifications, setClassifications] = useState<ReferenceOption[]>([]);
  const [connectionTypes, setConnectionTypes] = useState<ReferenceOption[]>([]);
  const [initialStatus, setInitialStatus] = useState<ReferenceOption | null>(
    null,
  );
  const [classificationCode, setClassificationCode] = useState("");
  const [connectionTypeCode, setConnectionTypeCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [contextResponse, optionsResponse] = await Promise.all([
          fetch(
            `/api/service-accounts/from-application/${encodeURIComponent(applicationNo)}`,
            { cache: "no-store" },
          ),
          fetch("/api/service-accounts/options"),
        ]);
        const [contextBody, optionsBody] = await Promise.all([
          contextResponse.json(),
          optionsResponse.json(),
        ]);
        if (!contextResponse.ok) throw new Error(contextBody.message);
        if (!optionsResponse.ok) throw new Error(optionsBody.message);
        if (!cancelled) {
          setContext(contextBody.data);
          setClassifications(optionsBody.data.classifications);
          setConnectionTypes(optionsBody.data.connectionTypes);
          const preferred = optionsBody.data.statuses.find(
            (status: ReferenceOption) =>
              classifyAccountStatus(status.code, status.name) === "pending",
          );
          setInitialStatus(preferred || null);
        }
      } catch (loadError) {
        if (!cancelled)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load the approved application.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [applicationNo]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const errors: Record<string, string> = {};
    if (!classificationCode)
      errors.classificationCode = "Select a classification.";
    if (!connectionTypeCode)
      errors.connectionTypeCode = "Select a connection type.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/service-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationNo,
          classificationCode,
          connectionTypeCode,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setFieldErrors(body.errors || {});
        throw new Error(
          body.message || "Unable to create the service account.",
        );
      }
      router.push(
        `/transactions/service-accounts/${encodeURIComponent(body.data.controlNo)}?created=1`,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create the service account.",
      );
      setSubmitting(false);
    }
  }

  const approved = context
    ? `${context.application.statusCode} ${context.application.status}`
        .toUpperCase()
        .includes("APPROV")
    : false;
  return (
    <TransactionShell active="service-accounts">
      <div className={styles.formShell}>
        <Link
          href={`/transactions/service-applications/${encodeURIComponent(applicationNo)}`}
          className={styles.backLink}
        >
          ← {applicationNo}
        </Link>
        <div className={styles.headingRow}>
          <div>
            <div className={styles.eyebrow}>Service Accounts</div>
            <h1 className={styles.title}>Create Service Account</h1>
            <p className={styles.subtitle}>
              Create the permanent water service record for this approved
              application.
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
            context && (
              <>
                {!approved && (
                  <div className={styles.notice}>
                    This application is {context.application.status}. Approve it
                    before creating a service account.
                  </div>
                )}
                {context.existingControlNo && (
                  <div className={styles.successNotice}>
                    This application already has service account{" "}
                    <strong>{context.existingControlNo}</strong>.{" "}
                    <Link
                      className={styles.viewLink}
                      href={`/transactions/service-accounts/${encodeURIComponent(context.existingControlNo)}`}
                    >
                      View Service Account
                    </Link>
                  </div>
                )}
                <section className={styles.section}>
                  <div className={styles.cardHeading}>
                    <div>
                      <h2 className={styles.sectionTitle}>
                        Application Reference
                      </h2>
                      <p className={styles.sectionDescription}>
                        Approved application information is read-only.
                      </p>
                    </div>
                    <ApplicationStatusBadge
                      code={context.application.statusCode}
                      name={context.application.status}
                    />
                  </div>
                  <div className={styles.customerCard}>
                    {[
                      ["Application No.", context.application.applicationNo],
                      ["Application Type", context.application.applicationType],
                      [
                        "Application Date",
                        formatDate(context.application.applicationDate),
                      ],
                      ["Application Status", context.application.status],
                    ].map(([label, value]) => (
                      <div className={styles.customerCardItem} key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Customer Information</h2>
                  <p className={styles.sectionDescription}>
                    Customer information is inherited from the application.
                  </p>
                  <div className={styles.customerCard}>
                    {[
                      ["Customer Name", context.customer.name],
                      ["Customer No.", context.customer.customerNo],
                      ["Address", context.customer.address || "—"],
                      ["Barangay", context.customer.barangay || "—"],
                      ["Contact Number", context.customer.contactNo || "—"],
                      ["Customer Status", context.customer.status],
                    ].map(([label, value]) => (
                      <div className={styles.customerCardItem} key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>
                    Service Account Information
                  </h2>
                  <p className={styles.sectionDescription}>
                    The control number is generated automatically when the
                    account is saved.
                  </p>
                  <div className={styles.fieldGrid}>
                    <div className={styles.fullField}>
                      <label className={styles.label}>Control No.</label>
                      <input
                        className={styles.input}
                        value="Generated automatically"
                        disabled
                      />
                    </div>
                    <div>
                      <label className={styles.label} htmlFor="classification">
                        Classification{" "}
                        <span className={styles.required}>*</span>
                      </label>
                      <select
                        id="classification"
                        className={styles.select}
                        value={classificationCode}
                        onChange={(event) =>
                          setClassificationCode(event.target.value)
                        }
                      >
                        <option value="">Select classification</option>
                        {classifications.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.classificationCode && (
                        <div className={styles.fieldError}>
                          {fieldErrors.classificationCode}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className={styles.label} htmlFor="connection-type">
                        Connection Type{" "}
                        <span className={styles.required}>*</span>
                      </label>
                      <select
                        id="connection-type"
                        className={styles.select}
                        value={connectionTypeCode}
                        onChange={(event) =>
                          setConnectionTypeCode(event.target.value)
                        }
                      >
                        <option value="">Select connection type</option>
                        {connectionTypes.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.connectionTypeCode && (
                        <div className={styles.fieldError}>
                          {fieldErrors.connectionTypeCode}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className={styles.label}>Initial Status</label>
                      <input
                        className={styles.input}
                        value={
                          initialStatus?.name ||
                          "Pending Installation status required"
                        }
                        disabled
                      />
                    </div>
                    <div>
                      <label className={styles.label}>Date Connected</label>
                      <input
                        className={styles.input}
                        value="Not yet connected"
                        disabled
                      />
                    </div>
                  </div>
                </section>
                <div className={styles.formActions}>
                  <Link
                    className={styles.secondaryButton}
                    href={`/transactions/service-applications/${encodeURIComponent(applicationNo)}`}
                  >
                    Cancel
                  </Link>
                  <button
                    className={styles.button}
                    disabled={
                      submitting ||
                      !approved ||
                      Boolean(context.existingControlNo) ||
                      !initialStatus
                    }
                  >
                    {submitting ? "Creating…" : "Create Service Account"}
                  </button>
                </div>
              </>
            )
          )}
        </form>
      </div>
    </TransactionShell>
  );
>>>>>>> 5e852f8f672f3ffc47731a0574417c82b0b41e8a
}
function Select({label,value,onChange,options,required,error}:{label:string;value:string;onChange:(value:string)=>void;options:ReferenceOption[];required?:boolean;error?:string}){return <div><label className={styles.label}>{label}{required&&<> <span className={styles.required}>*</span></>}</label><select className={styles.select} value={value} onChange={(event)=>onChange(event.target.value)}><option value="">Select {label.toLowerCase()}</option>{options.map((option)=><option key={option.code} value={option.code}>{option.name}</option>)}</select>{error&&<div className={styles.fieldError}>{error}</div>}</div>}
