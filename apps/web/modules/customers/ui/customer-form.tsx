"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CustomerOption,
  CustomerRecord,
  PurokOption,
} from "@/modules/customers/types";
import { TransactionShell } from "@/modules/transactions/ui/transaction-shell";
import styles from "@/modules/transactions/ui/transactions.module.css";

type Duplicate = {
  customerNo: string;
  name: string;
  address: string | null;
  contactNo: string | null;
};
export function CustomerForm({
  customerNo,
  returnTo,
}: {
  customerNo?: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const editing = Boolean(customerNo);
  const [barangays, setBarangays] = useState<CustomerOption[]>([]);
  const [puroks, setPuroks] = useState<PurokOption[]>([]);
  const [form, setForm] = useState({
    customerName: "",
    firstName: "",
    middleName: "",
    lastName: "",
    address: "",
    barangayCode: "",
    purokCode: "",
    contactNo: "",
    email: "",
    status: "ACTIVE",
  });
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const requests = [fetch("/api/customers/options")];
        if (customerNo)
          requests.push(
            fetch(`/api/customers/${encodeURIComponent(customerNo)}`, {
              cache: "no-store",
            }),
          );
        const responses = await Promise.all(requests);
        const options = await responses[0].json();
        if (!responses[0].ok) throw new Error(options.message);
        if (!cancelled) {
          setBarangays(options.data.barangays);
          setPuroks(options.data.puroks);
        }
        if (responses[1]) {
          const detail = await responses[1].json();
          if (!responses[1].ok) throw new Error(detail.message);
          const c = detail.data as CustomerRecord;
          if (!cancelled)
            setForm({
              customerName: c.customerName,
              firstName: c.firstName || "",
              middleName: c.middleName || "",
              lastName: c.lastName || "",
              address: c.address || "",
              barangayCode: c.barangayCode || "",
              purokCode: c.purokCode || "",
              contactNo: c.contactNo || "",
              email: c.email || "",
              status: c.status,
            });
        }
      } catch (loadError) {
        if (!cancelled)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load the customer form.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [customerNo]);
  function change(name: string, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "barangayCode" ? { purokCode: "" } : {}),
    }));
  }
  async function save(allowDuplicate = false) {
    if (submitting) return;
    const errors: Record<string, string> = {};
    if (!form.customerName.trim())
      errors.customerName = "Enter the customer name.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = "Enter a valid email address.";
    if (form.contactNo && !/^[+\d][\d\s().-]{6,24}$/.test(form.contactNo))
      errors.contactNo = "Enter a valid contact number.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(
        editing
          ? `/api/customers/${encodeURIComponent(customerNo!)}`
          : "/api/customers",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, allowDuplicate }),
        },
      );
      const body = await response.json();
      if (response.status === 409 && body.code === "LIKELY_DUPLICATE") {
        setDuplicates(body.matches);
        setSubmitting(false);
        return;
      }
      if (!response.ok) {
        setFieldErrors(body.errors || {});
        throw new Error(body.message || "Unable to save customer.");
      }
      const savedNo = editing ? customerNo! : body.data.customerNo;
      const safeReturn = returnTo?.startsWith(
        "/transactions/service-applications/new",
      )
        ? returnTo
        : null;
      router.push(
        safeReturn
          ? `${safeReturn}${safeReturn.includes("?") ? "&" : "?"}customer=${encodeURIComponent(savedNo)}`
          : `/transactions/customers/${encodeURIComponent(savedNo)}?${editing ? "updated" : "created"}=1`,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save customer. Please try again.",
      );
      setSubmitting(false);
    }
  }
  const availablePuroks = puroks.filter(
    (item) => item.barangayCode === form.barangayCode,
  );
  return (
    <TransactionShell active="customers">
      <div className={styles.formShell}>
        <Link
          className={styles.backLink}
          href={
            editing
              ? `/transactions/customers/${encodeURIComponent(customerNo!)}`
              : "/transactions/customers"
          }
        >
          ← {editing ? customerNo : "Customers"}
        </Link>
        <div className={styles.headingRow}>
          <div>
            <div className={styles.eyebrow}>Customer Management</div>
            <h1 className={styles.title}>
              {editing ? "Edit Customer" : "Add Customer"}
            </h1>
            <p className={styles.subtitle}>
              {editing
                ? "Update the customer's master information."
                : "Create a customer record that can be used for service applications and water service accounts."}
            </p>
          </div>
        </div>
        <form
          className={`${styles.panel} ${styles.formPanel}`}
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          {error && <div className={styles.notice}>{error}</div>}
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.skeleton} style={{ height: 240 }} />
            </div>
          ) : (
            <>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Customer Information</h2>
                <p className={styles.sectionDescription}>
                  Customer number is generated automatically and cannot be
                  edited.
                </p>
                <div className={styles.fieldGrid}>
                  <div className={styles.fullField}>
                    <label className={styles.label}>Customer No.</label>
                    <input
                      className={styles.input}
                      value={customerNo || "Generated automatically"}
                      disabled
                    />
                  </div>
                  <div className={styles.fullField}>
                    <label className={styles.label} htmlFor="customerName">
                      Customer Name <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="customerName"
                      className={styles.input}
                      value={form.customerName}
                      onChange={(event) =>
                        change("customerName", event.target.value)
                      }
                      placeholder="Full customer or account-holder name"
                      maxLength={200}
                    />
                    {fieldErrors.customerName && (
                      <div className={styles.fieldError}>
                        {fieldErrors.customerName}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={styles.label}>First Name</label>
                    <input
                      className={styles.input}
                      value={form.firstName}
                      onChange={(event) =>
                        change("firstName", event.target.value)
                      }
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Middle Name</label>
                    <input
                      className={styles.input}
                      value={form.middleName}
                      onChange={(event) =>
                        change("middleName", event.target.value)
                      }
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Last Name</label>
                    <input
                      className={styles.input}
                      value={form.lastName}
                      onChange={(event) =>
                        change("lastName", event.target.value)
                      }
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Status</label>
                    <select
                      className={styles.select}
                      value={form.status}
                      onChange={(event) => change("status", event.target.value)}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>
              </section>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Contact and Address</h2>
                <div className={styles.fieldGrid}>
                  <div className={styles.fullField}>
                    <label className={styles.label}>Address</label>
                    <textarea
                      className={styles.textarea}
                      value={form.address}
                      onChange={(event) =>
                        change("address", event.target.value)
                      }
                      maxLength={1000}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Barangay</label>
                    <select
                      className={styles.select}
                      value={form.barangayCode}
                      onChange={(event) =>
                        change("barangayCode", event.target.value)
                      }
                    >
                      <option value="">Select barangay</option>
                      {barangays.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={styles.label}>Purok</label>
                    <select
                      className={styles.select}
                      value={form.purokCode}
                      onChange={(event) =>
                        change("purokCode", event.target.value)
                      }
                      disabled={!form.barangayCode}
                    >
                      <option value="">Select purok</option>
                      {availablePuroks.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={styles.label}>Contact Number</label>
                    <input
                      className={styles.input}
                      value={form.contactNo}
                      onChange={(event) =>
                        change("contactNo", event.target.value)
                      }
                      placeholder="09xx xxx xxxx"
                      maxLength={50}
                    />
                    {fieldErrors.contactNo && (
                      <div className={styles.fieldError}>
                        {fieldErrors.contactNo}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={styles.label}>Email</label>
                    <input
                      type="email"
                      className={styles.input}
                      value={form.email}
                      onChange={(event) => change("email", event.target.value)}
                      maxLength={150}
                    />
                    {fieldErrors.email && (
                      <div className={styles.fieldError}>
                        {fieldErrors.email}
                      </div>
                    )}
                  </div>
                </div>
              </section>
              <div className={styles.formActions}>
                <Link
                  className={styles.secondaryButton}
                  href={
                    editing
                      ? `/transactions/customers/${encodeURIComponent(customerNo!)}`
                      : "/transactions/customers"
                  }
                >
                  Cancel
                </Link>
                <button className={styles.button} disabled={submitting}>
                  {submitting
                    ? "Saving…"
                    : editing
                      ? "Save Changes"
                      : "Add Customer"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
      {duplicates.length > 0 && (
        <div className={styles.dialogBackdrop}>
          <div className={styles.dialog} role="alertdialog" aria-modal="true">
            <h2>Similar customer found</h2>
            <p>
              A similar customer record already exists. Review it before
              choosing to continue.
            </p>
            {duplicates.map((item) => (
              <div
                className={styles.customerCard}
                style={{ gridTemplateColumns: "1fr", marginTop: 14 }}
                key={item.customerNo}
              >
                <div className={styles.customerCardItem}>
                  <span>{item.customerNo}</span>
                  <strong>{item.name}</strong>
                  <div className={styles.muted}>
                    {item.address || "No address"} ·{" "}
                    {item.contactNo || "No contact"}
                  </div>
                  <Link
                    className={styles.viewLink}
                    href={`/transactions/customers/${encodeURIComponent(item.customerNo)}`}
                  >
                    View Customer
                  </Link>
                </div>
              </div>
            ))}
            <div className={styles.dialogActions}>
              <button
                className={styles.ghostButton}
                onClick={() => setDuplicates([])}
              >
                Go back
              </button>
              <button
                className={styles.button}
                onClick={() => {
                  setDuplicates([]);
                  void save(true);
                }}
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </TransactionShell>
  );
}
