"use client";

import { useEffect, useMemo, useState } from "react";

interface BillingCycle {
  billing_cycle_id: string;
  cycle_code: string;
  cycle_name: string;
  number_of_days: number | null;
  description: string | null;
  is_active: boolean;
}

interface BillingCycleForm {
  cycle_code: string;
  cycle_name: string;
  number_of_days: string;
  description: string;
  is_active: boolean;
}

const emptyForm: BillingCycleForm = {
  cycle_code: "",
  cycle_name: "",
  number_of_days: "",
  description: "",
  is_active: true,
};

export default function BillingCyclesPage() {
  const [billingCycles, setBillingCycles] = useState<BillingCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingBillingCycleId, setEditingBillingCycleId] = useState<
    string | null
  >(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<BillingCycleForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBillingCycles();
  }, []);

  async function loadBillingCycles() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/billing-cycles");
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load billing cycles.");
      }

      setBillingCycles(result.data);
    } catch (error) {
      console.error("Billing cycles loading failed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load billing cycles.",
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredBillingCycles = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return billingCycles.filter((billingCycle) => {
      const matchesSearch =
        !searchValue ||
        billingCycle.cycle_code.toLowerCase().includes(searchValue) ||
        billingCycle.cycle_name.toLowerCase().includes(searchValue) ||
        (billingCycle.description ?? "").toLowerCase().includes(searchValue) ||
        String(billingCycle.number_of_days ?? "").includes(searchValue);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && billingCycle.is_active) ||
        (statusFilter === "inactive" && !billingCycle.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [billingCycles, search, statusFilter]);

  function openAddModal() {
    setEditingBillingCycleId(null);
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

  function updateForm(field: keyof BillingCycleForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleEditBillingCycle(billingCycle: BillingCycle) {
    setEditingBillingCycleId(billingCycle.billing_cycle_id);
    setForm({
      cycle_code: billingCycle.cycle_code,
      cycle_name: billingCycle.cycle_name,
      number_of_days:
        billingCycle.number_of_days === null
          ? ""
          : String(billingCycle.number_of_days),
      description: billingCycle.description ?? "",
      is_active: billingCycle.is_active,
    });
    setFormError("");
    setShowModal(true);
  }

  async function handleSaveBillingCycle(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setFormError("");
    setSaving(true);

    try {
      const isEditing = editingBillingCycleId !== null;
      const response = await fetch("/api/billing-cycles", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(isEditing ? { billing_cycle_id: editingBillingCycleId } : {}),
          cycle_code: form.cycle_code.trim(),
          cycle_name: form.cycle_name.trim(),
          number_of_days: form.number_of_days.trim() || null,
          description: form.description.trim() || null,
          is_active: form.is_active,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save billing cycle.");
      }

      await loadBillingCycles();
      setForm({ ...emptyForm });
      setEditingBillingCycleId(null);
      setShowModal(false);
    } catch (error) {
      console.error("Billing cycle save failed:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to save billing cycle.",
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
              Billing Cycles
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage billing cycle codes, names, and duration settings.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + Add Billing Cycle
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search billing cycles..."
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
              Loading billing cycles...
            </div>
          )}

          {!loading && error && (
            <div className="p-12 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={loadBillingCycles}
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
                    <th className="px-6 py-4 font-medium">Cycle Code</th>
                    <th className="px-6 py-4 font-medium">Cycle Name</th>
                    <th className="px-6 py-4 text-right font-medium">
                      Number of Days
                    </th>
                    <th className="px-6 py-4 font-medium">Description</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBillingCycles.map((billingCycle) => (
                    <tr
                      key={billingCycle.billing_cycle_id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {billingCycle.cycle_code}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {billingCycle.cycle_name}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {billingCycle.number_of_days ?? "—"}
                      </td>
                      <td className="max-w-sm truncate px-6 py-4 text-gray-600">
                        {billingCycle.description ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={
                            billingCycle.is_active
                              ? "inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
                              : "inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                          }
                        >
                          {billingCycle.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleEditBillingCycle(billingCycle)}
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredBillingCycles.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-sm text-gray-500"
                      >
                        No billing cycles found.
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
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-5">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingBillingCycleId
                  ? "Edit Billing Cycle"
                  : "Add Billing Cycle"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Define a billing cycle and its optional duration.
              </p>
            </div>

            <form onSubmit={handleSaveBillingCycle}>
              <div className="space-y-5 px-6 py-6">
                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}

                <div className="grid gap-5 md:grid-cols-2">
                  <FormInput
                    label="Cycle Code"
                    value={form.cycle_code}
                    onChange={(value) => updateForm("cycle_code", value)}
                    placeholder="e.g. MONTHLY"
                    required
                  />
                  <FormInput
                    label="Cycle Name"
                    value={form.cycle_name}
                    onChange={(value) => updateForm("cycle_name", value)}
                    placeholder="e.g. Monthly Billing"
                    required
                  />
                  <FormInput
                    label="Number of Days"
                    type="number"
                    value={form.number_of_days}
                    onChange={(value) => updateForm("number_of_days", value)}
                    placeholder="Optional"
                    step="1"
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
                    Active Billing Cycle
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
                  {saving ? "Saving..." : "Save Billing Cycle"}
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
