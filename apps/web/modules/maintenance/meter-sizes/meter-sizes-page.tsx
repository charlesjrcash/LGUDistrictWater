"use client";
import { useEffect, useMemo, useState } from "react";

interface MeterSize {
  meter_size_id: string;
  meter_size: string;
  description: string | null;
  is_active: boolean;
}
interface MeterSizeForm {
  meter_size: string;
  description: string;
  is_active: boolean;
}
const emptyForm: MeterSizeForm = {
  meter_size: "",
  description: "",
  is_active: true,
};

export default function MeterSizesPage() {
  const [meterSizes, setMeterSizes] = useState<MeterSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingMeterSizeId, setEditingMeterSizeId] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<MeterSizeForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    loadMeterSizes();
  }, []);
  async function loadMeterSizes() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/meter-sizes");
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Failed to load meter sizes.");
      setMeterSizes(result.data);
    } catch (error) {
      console.error("Meter sizes loading failed:", error);
      setError(
        error instanceof Error ? error.message : "Unable to load meter sizes.",
      );
    } finally {
      setLoading(false);
    }
  }
  const filteredMeterSizes = useMemo(() => {
    const value = search.trim().toLowerCase();
    return meterSizes.filter((meterSize) => {
      const matchesSearch =
        !value ||
        meterSize.meter_size.toLowerCase().includes(value) ||
        (meterSize.description ?? "").toLowerCase().includes(value);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && meterSize.is_active) ||
        (statusFilter === "inactive" && !meterSize.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [meterSizes, search, statusFilter]);
  function openAddModal() {
    setEditingMeterSizeId(null);
    setForm({ ...emptyForm });
    setFormError("");
    setShowModal(true);
  }
  function closeModal() {
    if (!saving) {
      setShowModal(false);
      setForm({ ...emptyForm });
      setEditingMeterSizeId(null);
      setFormError("");
    }
  }
  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setFormError("");
    setSuccessMessage("");
    setSaving(true);
    try {
      const editing = editingMeterSizeId !== null;
      const response = await fetch("/api/meter-sizes", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { meter_size_id: editingMeterSizeId } : {}),
          meter_size: form.meter_size.trim(),
          description: form.description.trim() || null,
          is_active: form.is_active,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Unable to save meter size.");
      await loadMeterSizes();
      setForm({ ...emptyForm });
      setEditingMeterSizeId(null);
      setShowModal(false);
      setSuccessMessage(result.message);
    } catch (error) {
      console.error("Meter size save failed:", error);
      setFormError(
        error instanceof Error ? error.message : "Unable to save meter size.",
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
              Meter Sizes
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage meter sizes used by meters, water rates, and service
              applications.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + Add Meter Size
          </button>
        </div>
        {successMessage && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search meter sizes..."
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
              Loading meter sizes...
            </div>
          )}
          {!loading && error && (
            <div className="p-12 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={loadMeterSizes}
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
                    <th className="px-6 py-4 font-medium">Meter Size</th>
                    <th className="px-6 py-4 font-medium">Description</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMeterSizes.map((meterSize) => (
                    <tr
                      key={meterSize.meter_size_id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {meterSize.meter_size}
                      </td>
                      <td className="max-w-sm truncate px-6 py-4 text-gray-600">
                        {meterSize.description ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={
                            meterSize.is_active
                              ? "inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
                              : "inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                          }
                        >
                          {meterSize.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMeterSizeId(meterSize.meter_size_id);
                            setForm({
                              meter_size: meterSize.meter_size,
                              description: meterSize.description ?? "",
                              is_active: meterSize.is_active,
                            });
                            setFormError("");
                            setShowModal(true);
                          }}
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredMeterSizes.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-sm text-gray-500"
                      >
                        No meter sizes found.
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
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingMeterSizeId ? "Edit Meter Size" : "Add Meter Size"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Define a meter size and its availability.
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
            <form onSubmit={handleSave}>
              <div className="space-y-5 px-6 py-6">
                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}
                <FormInput
                  label="Meter Size"
                  value={form.meter_size}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, meter_size: value }))
                  }
                  placeholder="e.g. 20mm"
                  required
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
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
                      setForm((current) => ({
                        ...current,
                        is_active: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Active Meter Size
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
                  {saving ? "Saving..." : "Save Meter Size"}
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
