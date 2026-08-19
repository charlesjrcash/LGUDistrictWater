"use client";
import { useEffect, useMemo, useState } from "react";
type PaymentMethod = {
  payment_method_id: string;
  payment_method_code: string;
  payment_method_name: string;
  description: string | null;
  is_active: boolean;
};
type PaymentMethodForm = {
  payment_method_code: string;
  payment_method_name: string;
  description: string;
  is_active: boolean;
};
const emptyForm: PaymentMethodForm = {
  payment_method_code: "",
  payment_method_name: "",
  description: "",
  is_active: true,
};

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentMethodForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void loadMethods();
  }, []);
  async function loadMethods() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/payment-method");
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Failed to load payment methods.");
      setMethods(result.data);
    } catch (caught) {
      console.error("Payment methods loading failed:", caught);
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load payment methods.",
      );
    } finally {
      setLoading(false);
    }
  }
  const filteredMethods = useMemo(() => {
    const value = search.trim().toLowerCase();
    return methods.filter((method) => {
      const matchingText =
        !value ||
        method.payment_method_code.toLowerCase().includes(value) ||
        method.payment_method_name.toLowerCase().includes(value) ||
        (method.description ?? "").toLowerCase().includes(value);
      const matchingStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && method.is_active) ||
        (statusFilter === "inactive" && !method.is_active);
      return matchingText && matchingStatus;
    });
  }, [methods, search, statusFilter]);
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
  function edit(method: PaymentMethod) {
    setEditingId(method.payment_method_id);
    setForm({
      payment_method_code: method.payment_method_code,
      payment_method_name: method.payment_method_name,
      description: method.description ?? "",
      is_active: method.is_active,
    });
    setFormError("");
    setShowModal(true);
  }
  function update(field: keyof PaymentMethodForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!form.payment_method_code.trim())
      return setFormError("Payment Method Code is required.");
    if (!form.payment_method_name.trim())
      return setFormError("Payment Method Name is required.");
    setSaving(true);
    try {
      const editing = editingId !== null;
      const response = await fetch("/api/payment-method", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { payment_method_id: editingId } : {}),
          payment_method_code: form.payment_method_code.trim(),
          payment_method_name: form.payment_method_name.trim(),
          description: form.description.trim() || null,
          is_active: form.is_active,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Unable to save payment method.");
      await loadMethods();
      setSuccess(result.message);
      setShowModal(false);
      setEditingId(null);
      setForm({ ...emptyForm });
    } catch (caught) {
      console.error("Payment method save failed:", caught);
      setFormError(
        caught instanceof Error
          ? caught.message
          : "Unable to save payment method.",
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
              Payment Method
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage the payment methods available for customer payments.
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + Add Payment Method
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
                placeholder="Search payment methods..."
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
              Loading payment methods...
            </div>
          )}
          {!loading && error && (
            <div className="p-12 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => void loadMethods()}
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
                    <th className="px-6 py-4 font-medium">
                      Payment Method Code
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Payment Method Name
                    </th>
                    <th className="px-6 py-4 font-medium">Description</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMethods.map((method) => (
                    <tr
                      key={method.payment_method_id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {method.payment_method_code}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {method.payment_method_name}
                      </td>
                      <td className="max-w-sm truncate px-6 py-4 text-gray-600">
                        {method.description ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={
                            method.is_active
                              ? "inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
                              : "inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                          }
                        >
                          {method.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => edit(method)}
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredMethods.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm text-gray-500"
                      >
                        No payment methods found.
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
                {editingId ? "Edit Payment Method" : "Add Payment Method"}
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
                    label="Payment Method Code"
                    required
                    value={form.payment_method_code}
                    onChange={(value) => update("payment_method_code", value)}
                    maxLength={30}
                    placeholder="e.g. CASH"
                  />
                  <Input
                    label="Payment Method Name"
                    required
                    value={form.payment_method_name}
                    onChange={(value) => update("payment_method_name", value)}
                    maxLength={100}
                    placeholder="e.g. Cash"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      update("description", event.target.value)
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
                      update("is_active", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Active Payment Method
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
                  {saving ? "Saving..." : "Save Payment Method"}
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
