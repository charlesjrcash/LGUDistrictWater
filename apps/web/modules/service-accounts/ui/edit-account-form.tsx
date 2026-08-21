"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReferenceOption } from "@/modules/service-applications/types";
import type { ServiceAccountDetail } from "@/modules/service-accounts/types";
import { TransactionShell } from "@/modules/transactions/ui/transaction-shell";
import styles from "@/modules/transactions/ui/transactions.module.css";

export function EditAccountForm({
  controlNo,
  variant = "page",
}: {
  controlNo: string;
  variant?: "page" | "modal";
}) {
  const isModal = variant === "modal";
  const router = useRouter();
  const [account, setAccount] = useState<ServiceAccountDetail | null>(null);
  const [options, setOptions] = useState<{
    classifications: ReferenceOption[];
    connectionTypes: ReferenceOption[];
    statuses: ReferenceOption[];
    serviceTypes: ReferenceOption[];
    readingRoutes: ReferenceOption[];
  } | null>(null);
  const [form, setForm] = useState({
    classificationCode: "",
    connectionTypeCode: "",
    connectionStatusCode: "",
    serviceTypeCode: "",
    routeCode: "",
    dateConnected: "",
    address: "",
  });
  const [loading, setLoading] = useState(true),
    [submitting, setSubmitting] = useState(false),
    [error, setError] = useState(""),
    [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [detailResponse, optionsResponse] = await Promise.all([
          fetch(`/api/service-accounts/${encodeURIComponent(controlNo)}`, {
            cache: "no-store",
          }),
          fetch("/api/service-accounts/options", { cache: "no-store" }),
        ]);
        const [detailBody, optionsBody] = await Promise.all([
          detailResponse.json(),
          optionsResponse.json(),
        ]);
        if (!detailResponse.ok) throw new Error(detailBody.message);
        if (!optionsResponse.ok) throw new Error(optionsBody.message);
        if (!cancelled) {
          const detail = detailBody.data as ServiceAccountDetail;
          setAccount(detail);
          setOptions(optionsBody.data);
          setForm({
            classificationCode: detail.classificationCode,
            connectionTypeCode: detail.connectionTypeCode,
            connectionStatusCode: detail.statusCode,
            serviceTypeCode: detail.serviceTypeCode || "",
            routeCode: detail.routeCode || "",
            dateConnected: detail.dateConnected?.slice(0, 10) || "",
            address: detail.serviceAddress || "",
          });
        }
      } catch (caught) {
        if (!cancelled)
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load the service account.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [controlNo]);
  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const errors: Record<string, string> = {};
    if (!form.classificationCode)
      errors.classificationCode = "Select a classification.";
    if (!form.connectionTypeCode)
      errors.connectionTypeCode = "Select a connection type.";
    if (!form.connectionStatusCode)
      errors.connectionStatusCode = "Select a connection status.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(
        `/api/service-accounts/${encodeURIComponent(controlNo)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        setFieldErrors(body.errors || {});
        throw new Error(
          body.message || "Unable to update the service account.",
        );
      }
      router.push(
        `/transactions/service-accounts/${encodeURIComponent(controlNo)}?updated=1`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update the service account.",
      );
      setSubmitting(false);
    }
  }
  return (
    <TransactionShell active="service-accounts" variant={variant}>
      <div className={styles.formShell}>
        {!isModal && (
          <Link
            className={styles.backLink}
            href={`/transactions/service-accounts/${encodeURIComponent(controlNo)}`}
          >
            ← {controlNo}
          </Link>
        )}
        <div className={styles.headingRow}>
          <div>
            <div className={styles.eyebrow}>Service Accounts</div>
            <h1 className={styles.title}>Edit Service Account</h1>
            <p className={styles.subtitle}>
              Update account settings while preserving its customer and
              application relationship.
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
            account &&
            options && (
              <>
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>
                    Linked Customer and Application
                  </h2>
                  <p className={styles.sectionDescription}>
                    These relationships are established by the approved
                    application and cannot be changed here.
                  </p>
                  <div className={styles.customerCard}>
                    {[
                      ["Control No.", account.controlNo],
                      ["Customer", account.customer.name],
                      ["Customer No.", account.customer.customerNo],
                      [
                        "Application",
                        account.application?.applicationNo ||
                          "No linked application",
                      ],
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
                  <div className={styles.fieldGrid}>
                    <Select
                      label="Classification"
                      value={form.classificationCode}
                      onChange={(value) => update("classificationCode", value)}
                      options={options.classifications}
                      required
                      error={fieldErrors.classificationCode}
                    />
                    <Select
                      label="Connection Type"
                      value={form.connectionTypeCode}
                      onChange={(value) => update("connectionTypeCode", value)}
                      options={options.connectionTypes}
                      required
                      error={fieldErrors.connectionTypeCode}
                    />
                    <Select
                      label="Connection Status"
                      value={form.connectionStatusCode}
                      onChange={(value) =>
                        update("connectionStatusCode", value)
                      }
                      options={options.statuses}
                      required
                      error={fieldErrors.connectionStatusCode}
                    />
                    <Select
                      label="Service Type"
                      value={form.serviceTypeCode}
                      onChange={(value) => update("serviceTypeCode", value)}
                      options={options.serviceTypes}
                    />
                    <Select
                      label="Reading Route"
                      value={form.routeCode}
                      onChange={(value) => update("routeCode", value)}
                      options={options.readingRoutes}
                    />
                    <div>
                      <label className={styles.label}>Date Connected</label>
                      <input
                        type="date"
                        className={styles.input}
                        value={form.dateConnected}
                        onChange={(event) =>
                          update("dateConnected", event.target.value)
                        }
                      />
                      {fieldErrors.dateConnected && (
                        <div className={styles.fieldError}>
                          {fieldErrors.dateConnected}
                        </div>
                      )}
                    </div>
                    <div className={styles.fullField}>
                      <label className={styles.label}>Service Address</label>
                      <textarea
                        className={styles.textarea}
                        value={form.address}
                        onChange={(event) =>
                          update("address", event.target.value)
                        }
                        maxLength={4000}
                      />
                    </div>
                  </div>
                </section>
                <div className={styles.formActions}>
                  <Link
                    className={styles.secondaryButton}
                    href={`/transactions/service-accounts/${encodeURIComponent(controlNo)}`}
                  >
                    Cancel
                  </Link>
                  <button className={styles.button} disabled={submitting}>
                    {submitting ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </>
            )
          )}
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
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReferenceOption[];
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
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </select>
      {error && <div className={styles.fieldError}>{error}</div>}
    </div>
  );
}
