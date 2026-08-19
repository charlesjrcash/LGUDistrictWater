"use client";

import { useEffect, useMemo, useState } from "react";

interface BillingPeriod {
  billing_period_id: string;
  period_code: string;
  period_name: string | null;
  start_date: string;
  end_date: string;
  due_date: string | null;
  disconnection_date: string | null;
  status: string;
}

interface BillingPeriodForm {
  period_code: string;
  period_name: string;
  start_date: string;
  end_date: string;
  due_date: string;
  disconnection_date: string;
  status: string;
}

const emptyForm: BillingPeriodForm = {
  period_code: "",
  period_name: "",
  start_date: "",
  end_date: "",
  due_date: "",
  disconnection_date: "",
  status: "OPEN",
};

const statuses = ["OPEN", "CLOSED"];

export default function BillingPeriodsPage() {
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingBillingPeriodId, setEditingBillingPeriodId] = useState<
    string | null
  >(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<BillingPeriodForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBillingPeriods();
  }, []);

  async function loadBillingPeriods() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/billing-periods");
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load billing periods.");
      }

      setBillingPeriods(result.data);
    } catch (error) {
      console.error("Billing periods loading failed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load billing periods.",
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredBillingPeriods = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return billingPeriods.filter((billingPeriod) => {
      const matchesSearch =
        !searchValue ||
        billingPeriod.period_code.toLowerCase().includes(searchValue) ||
        (billingPeriod.period_name ?? "").toLowerCase().includes(searchValue) ||
        billingPeriod.status.toLowerCase().includes(searchValue);

      return (
        matchesSearch &&
        (statusFilter === "all" || billingPeriod.status === statusFilter)
      );
    });
  }, [billingPeriods, search, statusFilter]);

  function formatDate(value: string | null) {
    if (!value) return "—";

    return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  }

  function openAddModal() {
    setEditingBillingPeriodId(null);
    setForm({ ...emptyForm });
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    if (!saving) {
      setShowModal(false);
      setFormError("");
    }
  }

  function updateForm(field: keyof BillingPeriodForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleEditBillingPeriod(billingPeriod: BillingPeriod) {
    setEditingBillingPeriodId(billingPeriod.billing_period_id);
    setForm({
      period_code: billingPeriod.period_code,
      period_name: billingPeriod.period_name ?? "",
      start_date: billingPeriod.start_date,
      end_date: billingPeriod.end_date,
      due_date: billingPeriod.due_date ?? "",
      disconnection_date: billingPeriod.disconnection_date ?? "",
      status: billingPeriod.status,
    });
    setFormError("");
    setShowModal(true);
  }

  async function handleSaveBillingPeriod(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setFormError("");

    if (form.end_date < form.start_date) {
      setFormError("End date cannot be earlier than start date.");
      return;
    }

    setSaving(true);

    try {
      const isEditing = editingBillingPeriodId !== null;
      const response = await fetch("/api/billing-periods", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEditing ? { billing_period_id: editingBillingPeriodId } : {}),
          period_code: form.period_code.trim(),
          period_name: form.period_name.trim() || null,
          start_date: form.start_date,
          end_date: form.end_date,
          due_date: form.due_date || null,
          disconnection_date: form.disconnection_date || null,
          status: form.status,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save billing period.");
      }

      await loadBillingPeriods();
      setForm({ ...emptyForm });
      setEditingBillingPeriodId(null);
      setShowModal(false);
    } catch (error) {
      console.error("Billing period save failed:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to save billing period.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              Billing Periods
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage billing schedules, due dates, and period status.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + Add Billing Period
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search billing periods..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 lg:max-w-md"
              />
              <div className="flex flex-wrap gap-3">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                {(search || statusFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {loading && (
            <div className="p-12 text-center text-sm text-gray-500">
              Loading billing periods...
            </div>
          )}
          {!loading && error && (
            <div className="p-12 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={loadBillingPeriods}
                className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
              >
                Try Again
              </button>
            </div>
          )}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Period Code</th>
                    <th className="px-6 py-4 font-medium">Period Name</th>
                    <th className="px-6 py-4 font-medium">Start Date</th>
                    <th className="px-6 py-4 font-medium">End Date</th>
                    <th className="px-6 py-4 font-medium">Due Date</th>
                    <th className="px-6 py-4 font-medium">
                      Disconnection Date
                    </th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBillingPeriods.map((billingPeriod) => (
                    <tr
                      key={billingPeriod.billing_period_id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {billingPeriod.period_code}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {billingPeriod.period_name ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(billingPeriod.start_date)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(billingPeriod.end_date)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(billingPeriod.due_date)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(billingPeriod.disconnection_date)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={
                            billingPeriod.status === "OPEN"
                              ? "inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
                              : "inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                          }
                        >
                          {billingPeriod.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleEditBillingPeriod(billingPeriod)}
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredBillingPeriods.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-12 text-center text-sm text-gray-500"
                      >
                        No billing periods found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-5">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingBillingPeriodId
                  ? "Edit Billing Period"
                  : "Add Billing Period"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Define a billing period and its schedule.
              </p>
            </div>
            <form onSubmit={handleSaveBillingPeriod}>
              <div className="space-y-5 px-6 py-6">
                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}
                <div className="grid gap-5 md:grid-cols-2">
                  <FormInput
                    label="Period Code"
                    value={form.period_code}
                    onChange={(value) => updateForm("period_code", value)}
                    placeholder="e.g. 2026-06"
                    required
                  />
                  <FormInput
                    label="Period Name"
                    value={form.period_name}
                    onChange={(value) => updateForm("period_name", value)}
                    placeholder="e.g. June 2026"
                  />
                  <FormInput
                    label="Start Date"
                    type="date"
                    value={form.start_date}
                    onChange={(value) => updateForm("start_date", value)}
                    required
                  />
                  <FormInput
                    label="End Date"
                    type="date"
                    value={form.end_date}
                    onChange={(value) => updateForm("end_date", value)}
                    required
                  />
                  <FormInput
                    label="Due Date"
                    type="date"
                    value={form.due_date}
                    onChange={(value) => updateForm("due_date", value)}
                  />
                  <FormInput
                    label="Disconnection Date"
                    type="date"
                    value={form.disconnection_date}
                    onChange={(value) =>
                      updateForm("disconnection_date", value)
                    }
                  />
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateForm("status", event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Billing Period"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function FormInput({
  label,
  value,
  onChange,
  ...props
}: { label: string; value: string; onChange: (value: string) => void } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
>) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        {...props}
      />
    </div>
  );
}
