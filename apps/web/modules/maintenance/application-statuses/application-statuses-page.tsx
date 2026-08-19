"use client";

import { useEffect, useMemo, useState } from "react";

interface ApplicationStatus {
  application_status_id: string;
  status_code: string;
  status_name: string;
  description: string | null;
  is_active: boolean;
}

interface ApplicationStatusForm {
  status_code: string;
  status_name: string;
  description: string;
  is_active: boolean;
}

const emptyForm: ApplicationStatusForm = {
  status_code: "",
  status_name: "",
  description: "",
  is_active: true,
};

export default function ApplicationStatusesPage() {
  const [applicationStatuses, setApplicationStatuses] = useState<
    ApplicationStatus[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingApplicationStatusId, setEditingApplicationStatusId] = useState<
    string | null
  >(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ApplicationStatusForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadApplicationStatuses();
  }, []);

  async function loadApplicationStatuses() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/application-statuses");
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load application statuses.",
        );
      }

      setApplicationStatuses(result.data);
    } catch (error) {
      console.error("Application statuses loading failed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load application statuses.",
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredApplicationStatuses = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return applicationStatuses.filter((applicationStatus) => {
      const matchesSearch =
        !searchValue ||
        applicationStatus.status_code.toLowerCase().includes(searchValue) ||
        applicationStatus.status_name.toLowerCase().includes(searchValue) ||
        (applicationStatus.description ?? "")
          .toLowerCase()
          .includes(searchValue);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && applicationStatus.is_active) ||
        (statusFilter === "inactive" && !applicationStatus.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [applicationStatuses, search, statusFilter]);

  function openAddModal() {
    setEditingApplicationStatusId(null);
    setForm({ ...emptyForm });
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    if (!saving) {
      setShowModal(false);
      setForm({ ...emptyForm });
      setEditingApplicationStatusId(null);
      setFormError("");
    }
  }

  function updateForm(
    field: keyof ApplicationStatusForm,
    value: string | boolean,
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleEditApplicationStatus(applicationStatus: ApplicationStatus) {
    setEditingApplicationStatusId(applicationStatus.application_status_id);
    setForm({
      status_code: applicationStatus.status_code,
      status_name: applicationStatus.status_name,
      description: applicationStatus.description ?? "",
      is_active: applicationStatus.is_active,
    });
    setFormError("");
    setShowModal(true);
  }

  async function handleSaveApplicationStatus(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (saving) return;

    setFormError("");
    setSuccessMessage("");
    setSaving(true);

    try {
      const isEditing = editingApplicationStatusId !== null;
      const response = await fetch("/api/application-statuses", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEditing
            ? { application_status_id: editingApplicationStatusId }
            : {}),
          status_code: form.status_code.trim(),
          status_name: form.status_name.trim(),
          description: form.description.trim() || null,
          is_active: form.is_active,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save application status.");
      }

      await loadApplicationStatuses();
      setForm({ ...emptyForm });
      setEditingApplicationStatusId(null);
      setShowModal(false);
      setSuccessMessage(result.message);
    } catch (error) {
      console.error("Application status save failed:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to save application status.",
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
              Application Statuses
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage application status records used by the application.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + Add Application Status
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
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search application statuses..."
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
              Loading application statuses...
            </div>
          )}
          {!loading && error && (
            <div className="p-12 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={loadApplicationStatuses}
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
                    <th className="px-6 py-4 font-medium">Status Code</th>
                    <th className="px-6 py-4 font-medium">Status Name</th>
                    <th className="px-6 py-4 font-medium">Description</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredApplicationStatuses.map((applicationStatus) => (
                    <tr
                      key={applicationStatus.application_status_id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {applicationStatus.status_code}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {applicationStatus.status_name}
                      </td>
                      <td className="max-w-sm truncate px-6 py-4 text-gray-600">
                        {applicationStatus.description ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={
                            applicationStatus.is_active
                              ? "inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
                              : "inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                          }
                        >
                          {applicationStatus.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            handleEditApplicationStatus(applicationStatus)
                          }
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredApplicationStatuses.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm text-gray-500"
                      >
                        No application statuses found.
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
                {editingApplicationStatusId
                  ? "Edit Application Status"
                  : "Add Application Status"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Define an application status and its availability.
              </p>
            </div>
            <form onSubmit={handleSaveApplicationStatus}>
              <div className="space-y-5 px-6 py-6">
                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}
                <div className="grid gap-5 md:grid-cols-2">
                  <FormInput
                    label="Status Code"
                    value={form.status_code}
                    onChange={(value) => updateForm("status_code", value)}
                    placeholder="e.g. PENDING"
                    required
                  />
                  <FormInput
                    label="Status Name"
                    value={form.status_name}
                    onChange={(value) => updateForm("status_name", value)}
                    placeholder="e.g. Pending"
                    required
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
                    Active Application Status
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
                  {saving ? "Saving..." : "Save Application Status"}
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
