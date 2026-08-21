"use client";

import { useEffect, useMemo, useState } from "react";

interface Fee {
  fee_id: string;
  fee_code: string;
  fee_name: string;
  fee_type: string;
  amount: string;
  effective_date: string;
  expiration_date: string | null;
  description: string | null;
  is_active: boolean;
}

interface FeeForm {
  fee_code: string;
  fee_name: string;
  fee_type: string;
  amount: string;
  effective_date: string;
  expiration_date: string;
  description: string;
  is_active: boolean;
}

const emptyForm: FeeForm = {
  fee_code: "",
  fee_name: "",
  fee_type: "CONNECTION",
  amount: "",
  effective_date: "2026-01-01",
  expiration_date: "",
  description: "",
  is_active: true,
};

const feeTypes = [
  "APPLICATION",
  "CONNECTION",
  "INSPECTION",
  "METER",
  "RECONNECTION",
];

export default function FeesPage() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [feeTypeFilter, setFeeTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState<FeeForm>(emptyForm);

  const [formError, setFormError] = useState("");

  const [saving, setSaving] = useState(false);

  /*
   * Load fees when page opens.
   */
  useEffect(() => {
    loadFees();
  }, []);

  async function loadFees() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/fees");

      if (!response.ok) {
        throw new Error("Failed to load fees.");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to load fees.");
      }

      setFees(result.data);
    } catch (error) {
      console.error("Fees loading failed:", error);

      setError(error instanceof Error ? error.message : "Unable to load fees.");
    } finally {
      setLoading(false);
    }
  }

  /*
   * Apply search and filters.
   */
  const filteredFees = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return fees.filter((fee) => {
      const matchesSearch =
        !searchValue ||
        fee.fee_code.toLowerCase().includes(searchValue) ||
        fee.fee_name.toLowerCase().includes(searchValue) ||
        fee.fee_type.toLowerCase().includes(searchValue) ||
        (fee.description ?? "").toLowerCase().includes(searchValue) ||
        fee.amount.includes(searchValue);

      const matchesFeeType =
        feeTypeFilter === "all" || fee.fee_type === feeTypeFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && fee.is_active) ||
        (statusFilter === "inactive" && !fee.is_active);

      return matchesSearch && matchesFeeType && matchesStatus;
    });
  }, [fees, search, feeTypeFilter, statusFilter]);

  /*
   * Reset filters.
   */
  function resetFilters() {
    setSearch("");
    setFeeTypeFilter("all");
    setStatusFilter("active");
  }

  /*
   * Format amount.
   */
  function formatAmount(amount: string) {
    return `₱${Number(amount).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  /*
   * Format PostgreSQL date.
   */
  function formatDate(value: string | null) {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("en-PH", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  }

  /*
   * Open Add Fee modal.
   */
  function openAddModal() {
    setFormError("");

    setForm({
      ...emptyForm,
    });

    setShowModal(true);
  }

  /*
   * Close modal.
   */
  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(false);
    setFormError("");
  }

  /*
   * Handle form changes.
   */
  function updateForm(field: keyof FeeForm, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleEditFee(fee: Fee) {
    setEditingFeeId(fee.fee_id);

    setForm({
      fee_code: fee.fee_code,
      fee_name: fee.fee_name,
      fee_type: fee.fee_type,
      amount: fee.amount,
      effective_date: fee.effective_date,
      expiration_date: fee.expiration_date ?? "",
      description: fee.description ?? "",
      is_active: fee.is_active,
    });

    setFormError("");
    setShowModal(true);
  }

  /*
   * Save new fee.
   *
   * For now this connects to:
   *
   * POST /api/fees
   */
  async function handleSaveFee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError("");
    setSaving(true);

    try {
      const isEditing = editingFeeId !== null;

      const response = await fetch("/api/fees", {
        method: isEditing ? "PUT" : "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          ...(isEditing
            ? {
                fee_id: editingFeeId,
              }
            : {}),

          fee_code: form.fee_code.trim(),

          fee_name: form.fee_name.trim(),

          fee_type: form.fee_type,

          amount: Number(form.amount),

          effective_date: form.effective_date,

          expiration_date:
            form.expiration_date === "" ? null : form.expiration_date,

          description:
            form.description.trim() === "" ? null : form.description.trim(),

          is_active: form.is_active,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save fee.");
      }

      await loadFees();

      setForm({
        ...emptyForm,
      });

      setEditingFeeId(null);

      setShowModal(false);
    } catch (error) {
      console.error("Fee save failed:", error);

      setFormError(
        error instanceof Error ? error.message : "Unable to save fee.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* PAGE HEADER */}

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Fees</h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage connection, meter, reconnection, document and other service
              fees.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + Add Fee
          </button>
        </div>

        {/* MAIN CARD */}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* TOOLBAR */}

          <div className="border-b border-gray-200 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* SEARCH */}

              <div className="relative w-full lg:max-w-md">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search fees..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* FILTERS */}

              <div className="flex flex-wrap gap-3">
                {/* FEE TYPE */}

                <select
                  value={feeTypeFilter}
                  onChange={(event) => setFeeTypeFilter(event.target.value)}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="all">All Fee Types</option>

                  {feeTypes.map((feeType) => (
                    <option key={feeType} value={feeType}>
                      {feeType}
                    </option>
                  ))}
                </select>

                {/* STATUS */}

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="active">Active</option>

                  <option value="inactive">Inactive</option>

                  <option value="all">All Status</option>
                </select>

                {/* RESET */}

                {(search ||
                  feeTypeFilter !== "all" ||
                  statusFilter !== "active") && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* LOADING */}

          {loading && (
            <div className="p-12 text-center text-sm text-gray-500">
              Loading fees...
            </div>
          )}

          {/* ERROR */}

          {!loading && error && (
            <div className="p-12 text-center">
              <p className="text-sm text-red-600">{error}</p>

              <button
                type="button"
                onClick={loadFees}
                className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
              >
                Try Again
              </button>
            </div>
          )}

          {/* TABLE */}

          {!loading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">Fee Code</th>

                      <th className="px-6 py-4 font-medium">Fee Name</th>

                      <th className="px-6 py-4 font-medium">Fee Type</th>

                      <th className="px-6 py-4 text-right font-medium">
                        Amount
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
                    {filteredFees.map((fee) => (
                      <tr key={fee.fee_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {fee.fee_code}
                        </td>

                        <td className="px-6 py-4 text-gray-900">
                          {fee.fee_name}
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {fee.fee_type}
                        </td>

                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          {formatAmount(fee.amount)}
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {formatDate(fee.effective_date)}
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {fee.expiration_date
                            ? formatDate(fee.expiration_date)
                            : "—"}
                        </td>

                        <td className="px-6 py-4">
                          {fee.is_active ? (
                            <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                              Inactive
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleEditFee(fee)}
                            className="rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* NO RESULTS */}

              {filteredFees.length === 0 && (
                <div className="border-t border-gray-100 p-12 text-center">
                  <p className="text-sm font-medium text-gray-700">
                    No fees found.
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Try changing your search or filters.
                  </p>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Reset filters
                  </button>
                </div>
              )}

              {/* FOOTER */}

              <div className="border-t border-gray-200 px-6 py-4">
                <p className="text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-medium text-gray-900">
                    {filteredFees.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-900">
                    {fees.length}
                  </span>{" "}
                  {fees.length === 1 ? "record" : "records"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ADD FEE MODAL */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            {/* MODAL HEADER */}

            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add Fee</h2>

                <p className="mt-1 text-sm text-gray-500">
                  Define a fee and its effective period.
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

            {/* FORM */}

            <form onSubmit={handleSaveFee}>
              <div className="space-y-5 px-6 py-6">
                {/* ERROR */}

                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}

                {/* CODE / NAME */}

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Fee Code
                    </label>

                    <input
                      type="text"
                      value={form.fee_code}
                      onChange={(event) =>
                        updateForm("fee_code", event.target.value)
                      }
                      placeholder="e.g. CONN-001"
                      required
                      maxLength={50}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Fee Name
                    </label>

                    <input
                      type="text"
                      value={form.fee_name}
                      onChange={(event) =>
                        updateForm("fee_name", event.target.value)
                      }
                      placeholder="e.g. New Connection Fee"
                      required
                      maxLength={150}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* TYPE / AMOUNT */}

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Fee Type
                    </label>

                    <select
                      value={form.fee_type}
                      onChange={(event) =>
                        updateForm("fee_type", event.target.value)
                      }
                      required
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {feeTypes.map((feeType) => (
                        <option key={feeType} value={feeType}>
                          {feeType}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Amount
                    </label>

                    <input
                      type="number"
                      value={form.amount}
                      onChange={(event) =>
                        updateForm("amount", event.target.value)
                      }
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* DATES */}

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Effective Date
                    </label>

                    <input
                      type="date"
                      value={form.effective_date}
                      onChange={(event) =>
                        updateForm("effective_date", event.target.value)
                      }
                      required
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Expiration Date
                    </label>

                    <input
                      type="date"
                      value={form.expiration_date}
                      onChange={(event) =>
                        updateForm("expiration_date", event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* DESCRIPTION */}

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

                {/* ACTIVE */}

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
                    Active Fee
                  </span>
                </label>
              </div>

              {/* MODAL FOOTER */}

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
                  {saving ? "Saving..." : "Save Fee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
