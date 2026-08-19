"use client";
import { useEffect, useState } from "react";
interface ReadingStatus {
  reading_status_id: string;
  status_code: string;
  status_name: string;
  description: string | null;
  is_active: boolean;
}
const emptyForm = {
  status_code: "",
  status_name: "",
  description: "",
  is_active: true,
};
export default function ReadingStatusesPage() {
  const [records, setRecords] = useState<ReadingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingReadingStatusId, setEditingReadingStatusId] = useState<
    string | null
  >(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  async function load() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/reading-statuses");
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Failed to load reading statuses.");
      setRecords(result.data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load reading statuses.",
      );
    } finally {
      setLoading(false);
    }
  }
  // The initial request populates this client-side maintenance table.
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  function openAdd() {
    setEditingReadingStatusId(null);
    setForm({ ...emptyForm });
    setFormError("");
    setShowModal(true);
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!form.status_code.trim()) {
      setFormError("Status Code is required.");
      return;
    }
    if (!form.status_name.trim()) {
      setFormError("Status Name is required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const editing = editingReadingStatusId !== null;
      const response = await fetch("/api/reading-statuses", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { reading_status_id: editingReadingStatusId } : {}),
          status_code: form.status_code.trim(),
          status_name: form.status_name.trim(),
          description: form.description.trim() || null,
          is_active: form.is_active,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Unable to save reading status.");
      await load();
      setForm({ ...emptyForm });
      setEditingReadingStatusId(null);
      setShowModal(false);
      setSuccess(result.message);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to save reading status.",
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
              Reading Statuses
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage statuses used by meter readings.
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white"
          >
            + Add Reading Status
          </button>
        </div>
        {success && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {success}
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading && (
            <div className="p-12 text-center">Loading reading statuses...</div>
          )}
          {error && (
            <div className="p-12 text-center text-red-600">{error}</div>
          )}
          {!loading && !error && (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4">Status Code</th>
                  <th className="px-6 py-4">Status Name</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.reading_status_id}>
                    <td className="px-6 py-4">{record.status_code}</td>
                    <td className="px-6 py-4">{record.status_name}</td>
                    <td className="px-6 py-4">{record.description ?? "—"}</td>
                    <td className="px-6 py-4">
                      {record.is_active ? "Active" : "Inactive"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingReadingStatusId(record.reading_status_id);
                          setForm({
                            status_code: record.status_code,
                            status_name: record.status_name,
                            description: record.description ?? "",
                            is_active: record.is_active,
                          });
                          setFormError("");
                          setShowModal(true);
                        }}
                        className="text-blue-600"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white">
            <form onSubmit={save}>
              <div className="space-y-5 px-6 py-6">
                <h2 className="text-xl font-semibold">
                  {editingReadingStatusId
                    ? "Edit Reading Status"
                    : "Add Reading Status"}
                </h2>
                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                    {formError}
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Fields marked with <span className="text-red-600">*</span> are
                  required.
                </p>
                <Field
                  label="Status Code"
                  required
                  value={form.status_code}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, status_code: value }))
                  }
                  error={!!formError && !form.status_code.trim()}
                />
                <Field
                  label="Status Name"
                  required
                  value={form.status_name}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, status_name: value }))
                  }
                  error={!!formError && !form.status_name.trim()}
                />
                <div>
                  <label className="block text-sm font-medium">
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
                    className="w-full rounded-lg border px-4 py-2.5"
                  />
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        is_active: event.target.checked,
                      }))
                    }
                  />{" "}
                  Active Reading Status
                </label>
              </div>
              <div className="flex justify-end gap-3 border-t px-6 py-4">
                <button
                  type="button"
                  onClick={() => !saving && setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-white"
                >
                  {saving ? "Saving..." : "Save Reading Status"}
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
  required,
  value,
  onChange,
  error,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-lg border px-4 py-2.5 ${error ? "border-red-500" : "border-gray-300"}`}
      />
    </div>
  );
}
