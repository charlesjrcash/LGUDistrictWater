"use client";
import { useEffect, useMemo, useState } from "react";
type Reader = {
  meter_reader_id: string;
  employee_id: string;
  reader_code: string;
  is_active: boolean;
  employee_code: string;
  employee_name: string;
};
type Employee = {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  is_active: boolean;
};
type Form = { employee_id: string; reader_code: string; is_active: boolean };
const emptyForm: Form = { employee_id: "", reader_code: "", is_active: true };
export default function MeterReadersPage() {
  const [readers, setReaders] = useState<Reader[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void Promise.all([loadReaders(), loadEmployees()]);
  }, []);
  async function loadReaders() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/meter-reader");
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Failed to load meter readers.");
      setReaders(result.data);
    } catch (caught) {
      console.error("Meter readers loading failed:", caught);
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load meter readers.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function loadEmployees() {
    try {
      setEmployeesLoading(true);
      const response = await fetch("/api/employee");
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Failed to load employees.");
      setEmployees(result.data);
    } catch (caught) {
      console.error("Employees loading failed:", caught);
      setError(
        (current) =>
          current ||
          (caught instanceof Error
            ? caught.message
            : "Unable to load employees."),
      );
    } finally {
      setEmployeesLoading(false);
    }
  }
  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    return readers.filter((reader) => {
      const match =
        !value ||
        reader.reader_code.toLowerCase().includes(value) ||
        reader.employee_code.toLowerCase().includes(value) ||
        reader.employee_name.toLowerCase().includes(value);
      const status =
        statusFilter === "all" ||
        (statusFilter === "active" && reader.is_active) ||
        (statusFilter === "inactive" && !reader.is_active);
      return match && status;
    });
  }, [readers, search, statusFilter]);
  const availableEmployees = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.is_active || employee.employee_id === form.employee_id,
      ),
    [employees, form.employee_id],
  );
  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError("");
    setShowModal(true);
  }
  function closeModal() {
    if (!saving) {
      setShowModal(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      setFormError("");
    }
  }
  function edit(reader: Reader) {
    setEditingId(reader.meter_reader_id);
    setForm({
      employee_id: reader.employee_id,
      reader_code: reader.reader_code,
      is_active: reader.is_active,
    });
    setFormError("");
    setShowModal(true);
  }
  function update(field: keyof Form, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!form.employee_id) return setFormError("Employee is required.");
    if (!form.reader_code.trim())
      return setFormError("Reader Code is required.");
    setSaving(true);
    try {
      const editing = editingId !== null;
      const response = await fetch("/api/meter-reader", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { meter_reader_id: editingId } : {}),
          employee_id: form.employee_id,
          reader_code: form.reader_code.trim(),
          is_active: form.is_active,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Unable to save meter reader.");
      await loadReaders();
      setSuccess(result.message);
      setShowModal(false);
      setEditingId(null);
      setForm({ ...emptyForm });
    } catch (caught) {
      console.error("Meter reader save failed:", caught);
      setFormError(
        caught instanceof Error
          ? caught.message
          : "Unable to save meter reader.",
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
              Meter Readers
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage employees assigned as meter readers.
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + Add Meter Reader
          </button>
        </div>
        {success && (
          <div className="mb-5 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <span>{success}</span>
            <button
              type="button"
              onClick={() => setSuccess("")}
              className="font-medium"
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search meter readers..."
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
              Loading meter readers...
            </div>
          )}
          {!loading && error && (
            <div className="p-12 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={() =>
                  void Promise.all([loadReaders(), loadEmployees()])
                }
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
                    <th className="px-6 py-4 font-medium">Reader Code</th>
                    <th className="px-6 py-4 font-medium">Employee</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((reader) => (
                    <tr
                      key={reader.meter_reader_id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {reader.reader_code}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {reader.employee_code} - {reader.employee_name}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={
                            reader.is_active
                              ? "inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
                              : "inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                          }
                        >
                          {reader.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => edit(reader)}
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
                        colSpan={4}
                        className="px-6 py-12 text-center text-sm text-gray-500"
                      >
                        No meter readers found.
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
                  {editingId ? "Edit Meter Reader" : "Add Meter Reader"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Fields marked with <span className="text-red-600">*</span>{" "}
                  are required.
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
            <form onSubmit={save}>
              <div className="space-y-5 px-6 py-6">
                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Employee <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={form.employee_id}
                      onChange={(event) =>
                        update("employee_id", event.target.value)
                      }
                      disabled={employeesLoading}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
                    >
                      <option value="">
                        {employeesLoading
                          ? "Loading employees..."
                          : "Select Employee"}
                      </option>
                      {availableEmployees.map((employee) => (
                        <option
                          key={employee.employee_id}
                          value={employee.employee_id}
                        >
                          {employee.employee_code} - {employee.employee_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Reader Code"
                    required
                    value={form.reader_code}
                    onChange={(value) => update("reader_code", value)}
                    maxLength={30}
                    placeholder="e.g. MR-001"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) =>
                      update("is_active", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Active
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
                  disabled={saving || employeesLoading}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Meter Reader"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
function Input({
  label,
  required = false,
  value,
  onChange,
  ...props
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <>
            {" "}
            <span className="text-red-600">*</span>
          </>
        )}
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
