"use client";
import { useEffect, useMemo, useState } from "react";

interface Barangay {
  barangay_id: string;
  barangay_code: string;
  barangay_name: string;
  description: string | null;
  is_active: boolean;
}
interface BarangayForm {
  barangay_code: string;
  barangay_name: string;
  description: string;
  is_active: boolean;
}
const emptyForm: BarangayForm = {
  barangay_code: "",
  barangay_name: "",
  description: "",
  is_active: true,
};

export default function BarangaysPage() {
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingBarangayId, setEditingBarangayId] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<BarangayForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    loadBarangays();
  }, []);
  async function loadBarangays() {
    try {
      setLoading(true);
      setError("");
      const r = await fetch("/api/barangays");
      const data = await r.json();
      if (!r.ok || !data.success)
        throw new Error(data.message || "Failed to load barangays.");
      setBarangays(data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load barangays.");
    } finally {
      setLoading(false);
    }
  }
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return barangays.filter(
      (b) =>
        (!q ||
          b.barangay_code.toLowerCase().includes(q) ||
          b.barangay_name.toLowerCase().includes(q) ||
          (b.description ?? "").toLowerCase().includes(q)) &&
        (statusFilter === "all" ||
          (statusFilter === "active" && b.is_active) ||
          (statusFilter === "inactive" && !b.is_active)),
    );
  }, [barangays, search, statusFilter]);
  function update(field: keyof BarangayForm, value: string | boolean) {
    setForm((v) => ({ ...v, [field]: value }));
  }
  function add() {
    setEditingBarangayId(null);
    setForm({ ...emptyForm });
    setFormError("");
    setShowModal(true);
  }
  function edit(b: Barangay) {
    setEditingBarangayId(b.barangay_id);
    setForm({
      barangay_code: b.barangay_code,
      barangay_name: b.barangay_name,
      description: b.description ?? "",
      is_active: b.is_active,
    });
    setFormError("");
    setShowModal(true);
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const isEditing = editingBarangayId !== null;
      const r = await fetch("/api/barangays", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEditing ? { barangay_id: editingBarangayId } : {}),
          barangay_code: form.barangay_code.trim(),
          barangay_name: form.barangay_name.trim(),
          description: form.description.trim() || null,
          is_active: form.is_active,
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.success)
        throw new Error(data.message || "Unable to save barangay.");
      await loadBarangays();
      setForm({ ...emptyForm });
      setEditingBarangayId(null);
      setShowModal(false);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to save barangay.",
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
            <h1 className="text-3xl font-semibold text-gray-900">Barangays</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage barangay codes and locations.
            </p>
          </div>
          <button
            type="button"
            onClick={add}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + Add Barangay
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search barangays..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 lg:max-w-md"
              />
              <div className="flex gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
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
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
          {loading && (
            <div className="p-12 text-center text-sm text-gray-500">
              Loading barangays...
            </div>
          )}
          {!loading && error && (
            <div className="p-12 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={loadBarangays}
                className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white"
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
                    <th className="px-6 py-4 font-medium">Barangay Code</th>
                    <th className="px-6 py-4 font-medium">Barangay Name</th>
                    <th className="px-6 py-4 font-medium">Description</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((b) => (
                    <tr key={b.barangay_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {b.barangay_code}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {b.barangay_name}
                      </td>
                      <td className="max-w-sm truncate px-6 py-4 text-gray-600">
                        {b.description ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={
                            b.is_active
                              ? "inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
                              : "inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                          }
                        >
                          {b.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => edit(b)}
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm text-gray-500"
                      >
                        No barangays found.
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
                {editingBarangayId ? "Edit Barangay" : "Add Barangay"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Define a barangay code and name.
              </p>
            </div>
            <form onSubmit={save}>
              <div className="space-y-5 px-6 py-6">
                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Barangay Code"
                    value={form.barangay_code}
                    onChange={(v) => update("barangay_code", v)}
                    required
                  />
                  <Field
                    label="Barangay Name"
                    value={form.barangay_name}
                    onChange={(v) => update("barangay_name", v)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => update("is_active", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Active Barangay
                  </span>
                </label>
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => !saving && setShowModal(false)}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Barangay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
function Field({
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
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
        {...props}
      />
    </div>
  );
}
