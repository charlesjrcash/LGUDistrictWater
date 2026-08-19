"use client";
import { useEffect, useMemo, useState } from "react";
type Employee = {
  employee_id: string;
  employee_code: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  employee_name: string;
  position: string | null;
  contact_no: string | null;
  email: string | null;
  is_active: boolean;
};
type EmployeeForm = {
  employee_code: string;
  employee_name: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  position: string;
  contact_no: string;
  email: string;
  is_active: boolean;
};
const emptyForm: EmployeeForm = {
  employee_code: "",
  employee_name: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  position: "",
  contact_no: "",
  email: "",
  is_active: true,
};
export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void loadEmployees();
  }, []);
  async function loadEmployees() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/employee");
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Failed to load employees.");
      setEmployees(result.data);
    } catch (caught) {
      console.error("Employees loading failed:", caught);
      setError(
        caught instanceof Error ? caught.message : "Unable to load employees.",
      );
    } finally {
      setLoading(false);
    }
  }
  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const match =
        !value ||
        employee.employee_code.toLowerCase().includes(value) ||
        employee.employee_name.toLowerCase().includes(value) ||
        (employee.position ?? "").toLowerCase().includes(value) ||
        (employee.contact_no ?? "").toLowerCase().includes(value) ||
        (employee.email ?? "").toLowerCase().includes(value);
      const status =
        statusFilter === "all" ||
        (statusFilter === "active" && employee.is_active) ||
        (statusFilter === "inactive" && !employee.is_active);
      return match && status;
    });
  }, [employees, search, statusFilter]);
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
  function edit(employee: Employee) {
    setEditingId(employee.employee_id);
    setForm({
      employee_code: employee.employee_code,
      employee_name: employee.employee_name,
      first_name: employee.first_name ?? "",
      middle_name: employee.middle_name ?? "",
      last_name: employee.last_name ?? "",
      position: employee.position ?? "",
      contact_no: employee.contact_no ?? "",
      email: employee.email ?? "",
      is_active: employee.is_active,
    });
    setFormError("");
    setShowModal(true);
  }
  function update(field: keyof EmployeeForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!form.employee_code.trim())
      return setFormError("Employee Code is required.");
    if (!form.employee_name.trim())
      return setFormError("Employee Name is required.");
    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    )
      return setFormError("Please enter a valid email address.");
    setSaving(true);
    try {
      const editing = editingId !== null;
      const response = await fetch("/api/employee", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { employee_id: editingId } : {}),
          employee_code: form.employee_code.trim(),
          employee_name: form.employee_name.trim(),
          first_name: form.first_name.trim() || null,
          middle_name: form.middle_name.trim() || null,
          last_name: form.last_name.trim() || null,
          position: form.position.trim() || null,
          contact_no: form.contact_no.trim() || null,
          email: form.email.trim() || null,
          is_active: form.is_active,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Unable to save employee.");
      await loadEmployees();
      setSuccess(result.message);
      setShowModal(false);
      setEditingId(null);
      setForm({ ...emptyForm });
    } catch (caught) {
      console.error("Employee save failed:", caught);
      setFormError(
        caught instanceof Error ? caught.message : "Unable to save employee.",
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
            <h1 className="text-3xl font-semibold text-gray-900">Employee</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage employees and employee information used throughout the
              water district system.
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + Add Employee
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
                placeholder="Search employees..."
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
              Loading employees...
            </div>
          )}
          {!loading && error && (
            <div className="p-12 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => void loadEmployees()}
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
                    <th className="px-6 py-4 font-medium">Employee Code</th>
                    <th className="px-6 py-4 font-medium">Employee Name</th>
                    <th className="px-6 py-4 font-medium">Position</th>
                    <th className="px-6 py-4 font-medium">Contact No.</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((employee) => (
                    <tr key={employee.employee_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {employee.employee_code}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {employee.employee_name}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {employee.position ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {employee.contact_no ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {employee.email ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={
                            employee.is_active
                              ? "inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
                              : "inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                          }
                        >
                          {employee.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => edit(employee)}
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
                        colSpan={7}
                        className="px-6 py-12 text-center text-sm text-gray-500"
                      >
                        No employees found.
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
                {editingId ? "Edit Employee" : "Add Employee"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Fields marked with <span className="text-red-600">*</span> are
                required.
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
                  <Input
                    label="Employee Code"
                    required
                    value={form.employee_code}
                    onChange={(value) => update("employee_code", value)}
                    maxLength={30}
                  />
                  <Input
                    label="Employee Name"
                    required
                    value={form.employee_name}
                    onChange={(value) => update("employee_name", value)}
                    maxLength={200}
                  />
                  <Input
                    label="First Name"
                    value={form.first_name}
                    onChange={(value) => update("first_name", value)}
                    maxLength={100}
                  />
                  <Input
                    label="Middle Name"
                    value={form.middle_name}
                    onChange={(value) => update("middle_name", value)}
                    maxLength={100}
                  />
                  <Input
                    label="Last Name"
                    value={form.last_name}
                    onChange={(value) => update("last_name", value)}
                    maxLength={100}
                  />
                  <Input
                    label="Position"
                    value={form.position}
                    onChange={(value) => update("position", value)}
                    maxLength={100}
                  />
                  <Input
                    label="Contact No."
                    value={form.contact_no}
                    onChange={(value) => update("contact_no", value)}
                    maxLength={50}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(value) => update("email", value)}
                    maxLength={150}
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
                    Active Employee
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
                  {saving ? "Saving..." : "Save Employee"}
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
