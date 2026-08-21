"use client";

import { useEffect, useMemo, useState } from "react";

interface PenaltyRate {
  penalty_id: string;
  penalty_code: string;
  penalty_name: string;
  penalty_type: string;
  rate: string;
  grace_period_days: number;
  maximum_penalty: string | null;
  effective_date: string;
  expiration_date: string | null;
  description: string | null;
  is_active: boolean;
}

interface PenaltyRateForm {
  penalty_code: string;
  penalty_name: string;
  penalty_type: string;
  rate: string;
  grace_period_days: string;
  maximum_penalty: string;
  effective_date: string;
  expiration_date: string;
  description: string;
  is_active: boolean;
}

const emptyForm: PenaltyRateForm = {
  penalty_code: "",
  penalty_name: "",
  penalty_type: "",
  rate: "",
  grace_period_days: "0",
  maximum_penalty: "",
  effective_date: "2026-01-01",
  expiration_date: "",
  description: "",
  is_active: true,
};

export default function PenaltyRatesPage() {
  const [penaltyRates, setPenaltyRates] = useState<PenaltyRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPenaltyId, setEditingPenaltyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<PenaltyRateForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPenaltyRates();
  }, []);

  async function loadPenaltyRates() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/penalty-rates");
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load penalty rates.");
      }

      setPenaltyRates(result.data);
    } catch (error) {
      console.error("Penalty rates loading failed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load penalty rates.",
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredPenaltyRates = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return penaltyRates.filter((penaltyRate) => {
      const matchesSearch =
        !searchValue ||
        penaltyRate.penalty_code.toLowerCase().includes(searchValue) ||
        penaltyRate.penalty_name.toLowerCase().includes(searchValue) ||
        penaltyRate.penalty_type.toLowerCase().includes(searchValue) ||
        (penaltyRate.description ?? "").toLowerCase().includes(searchValue) ||
        penaltyRate.rate.includes(searchValue);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && penaltyRate.is_active) ||
        (statusFilter === "inactive" && !penaltyRate.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [penaltyRates, search, statusFilter]);

  function formatDate(value: string | null) {
    if (!value) return "—";

    return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  }

  function formatNumber(value: string | null, maximumFractionDigits: number) {
    if (value === null) return "—";

    return Number(value).toLocaleString("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits,
    });
  }

  function openAddModal() {
    setEditingPenaltyId(null);
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

  function updateForm(field: keyof PenaltyRateForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleEditPenaltyRate(penaltyRate: PenaltyRate) {
    setEditingPenaltyId(penaltyRate.penalty_id);
    setForm({
      penalty_code: penaltyRate.penalty_code,
      penalty_name: penaltyRate.penalty_name,
      penalty_type: penaltyRate.penalty_type,
      rate: penaltyRate.rate,
      grace_period_days: String(penaltyRate.grace_period_days),
      maximum_penalty: penaltyRate.maximum_penalty ?? "",
      effective_date: penaltyRate.effective_date,
      expiration_date: penaltyRate.expiration_date ?? "",
      description: penaltyRate.description ?? "",
      is_active: penaltyRate.is_active,
    });
    setFormError("");
    setShowModal(true);
  }

  async function handleSavePenaltyRate(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setFormError("");

    if (form.expiration_date && form.expiration_date < form.effective_date) {
      setFormError(
        "Expiration date cannot be earlier than the effective date.",
      );
      return;
    }

    setSaving(true);

    try {
      const isEditing = editingPenaltyId !== null;
      const response = await fetch("/api/penalty-rates", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEditing ? { penalty_id: editingPenaltyId } : {}),
          penalty_code: form.penalty_code.trim(),
          penalty_name: form.penalty_name.trim(),
          penalty_type: form.penalty_type.trim(),
          rate: form.rate.trim(),
          grace_period_days: form.grace_period_days.trim(),
          maximum_penalty: form.maximum_penalty.trim() || null,
          effective_date: form.effective_date,
          expiration_date: form.expiration_date || null,
          description: form.description.trim() || null,
          is_active: form.is_active,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save penalty rate.");
      }

      await loadPenaltyRates();
      setForm({ ...emptyForm });
      setEditingPenaltyId(null);
      setShowModal(false);
    } catch (error) {
      console.error("Penalty rate save failed:", error);
      setFormError(
        error instanceof Error ? error.message : "Unable to save penalty rate.",
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
              Penalty Rates
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage late-payment penalty rates and their effective periods.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + Add Penalty Rate
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search penalty rates..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 lg:max-w-md"
              />
              <div className="flex flex-wrap gap-3">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="all">All Status</option>
                </select>
                {(search || statusFilter !== "active") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("active");
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
              Loading penalty rates...
            </div>
          )}
          {!loading && error && (
            <div className="p-12 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={loadPenaltyRates}
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
                    <th className="px-6 py-4 font-medium">Penalty Code</th>
                    <th className="px-6 py-4 font-medium">Penalty Name</th>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 text-right font-medium">Rate</th>
                    <th className="px-6 py-4 text-right font-medium">
                      Grace Days
                    </th>
                    <th className="px-6 py-4 text-right font-medium">
                      Maximum Penalty
                    </th>
                    <th className="px-6 py-4 font-medium">Effective Date</th>
                    <th className="px-6 py-4 font-medium">Expiration</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPenaltyRates.map((penaltyRate) => (
                    <tr
                      key={penaltyRate.penalty_id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {penaltyRate.penalty_code}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {penaltyRate.penalty_name}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {penaltyRate.penalty_type}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        {formatNumber(penaltyRate.rate, 4)}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {penaltyRate.grace_period_days}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {formatNumber(penaltyRate.maximum_penalty, 2)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(penaltyRate.effective_date)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(penaltyRate.expiration_date)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={
                            penaltyRate.is_active
                              ? "inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
                              : "inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                          }
                        >
                          {penaltyRate.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleEditPenaltyRate(penaltyRate)}
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPenaltyRates.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-6 py-12 text-center text-sm text-gray-500"
                      >
                        No penalty rates found.
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
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingPenaltyId ? "Edit Penalty Rate" : "Add Penalty Rate"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Define a penalty rate and its effective period.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
                className="-mr-2 -mt-1 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSavePenaltyRate}>
              <div className="space-y-5 px-6 py-6">
                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}
                <div className="grid gap-5 md:grid-cols-2">
                  <FormInput
                    label="Penalty Code"
                    value={form.penalty_code}
                    onChange={(value) => updateForm("penalty_code", value)}
                    placeholder="e.g. LATE-001"
                    maxLength={30}
                    required
                  />
                  <FormInput
                    label="Penalty Name"
                    value={form.penalty_name}
                    onChange={(value) => updateForm("penalty_name", value)}
                    placeholder="e.g. Late Payment Penalty"
                    maxLength={100}
                    required
                  />
                  <FormInput
                    label="Penalty Type"
                    value={form.penalty_type}
                    onChange={(value) => updateForm("penalty_type", value)}
                    placeholder="e.g. PERCENTAGE"
                    maxLength={30}
                    required
                  />
                  <FormInput
                    label="Rate"
                    type="number"
                    value={form.rate}
                    onChange={(value) => updateForm("rate", value)}
                    placeholder="0.0000"
                    min="0"
                    step="0.0001"
                    required
                  />
                  <FormInput
                    label="Grace Period Days"
                    type="number"
                    value={form.grace_period_days}
                    onChange={(value) => updateForm("grace_period_days", value)}
                    min="0"
                    step="1"
                    required
                  />
                  <FormInput
                    label="Maximum Penalty"
                    type="number"
                    value={form.maximum_penalty}
                    onChange={(value) => updateForm("maximum_penalty", value)}
                    placeholder="Optional"
                    min="0"
                    step="0.01"
                  />
                  <FormInput
                    label="Effective Date"
                    type="date"
                    value={form.effective_date}
                    onChange={(value) => updateForm("effective_date", value)}
                    required
                  />
                  <FormInput
                    label="Expiration Date"
                    type="date"
                    value={form.expiration_date}
                    onChange={(value) => updateForm("expiration_date", value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                    rows={3}
                    placeholder="Optional description..."
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) =>
                      updateForm("is_active", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Active Penalty Rate
                  </span>
                </label>
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
                  {saving ? "Saving..." : "Save Penalty Rate"}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
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
