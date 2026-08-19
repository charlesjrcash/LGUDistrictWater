"use client";

import { useEffect, useMemo, useState } from "react";

type Role = {
  role_id: string;
  role_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};
type RoleForm = { role_name: string; description: string; is_active: boolean };
const emptyForm: RoleForm = { role_name: "", description: "", is_active: true };

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void loadRoles();
  }, []);
  async function loadRoles() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/roles");
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Unable to load system roles.");
      setRoles(result.data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to connect to the server. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }
  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    return roles.filter(
      (role) =>
        !value ||
        role.role_name.toLowerCase().includes(value) ||
        (role.description ?? "").toLowerCase().includes(value),
    );
  }, [roles, search]);
  function openNew() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError("");
    setModal(true);
  }
  function openEdit(role: Role) {
    setEditingId(role.role_id);
    setForm({
      role_name: role.role_name,
      description: role.description ?? "",
      is_active: role.is_active,
    });
    setFormError("");
    setModal(true);
  }
  function close() {
    if (!saving) {
      setModal(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      setFormError("");
    }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!form.role_name.trim())
      return setFormError("Please provide the required role information.");
    setSaving(true);
    try {
      const editing = editingId !== null;
      const response = await fetch("/api/roles", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { role_id: editingId, is_active: form.is_active } : {}),
          role_name: form.role_name.trim(),
          description: form.description.trim() || null,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(
          result.message || "The role could not be saved. Please try again.",
        );
      await loadRoles();
      setSuccess(result.message);
      setModal(false);
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "Unable to connect to the server. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function toggle(role: Role) {
    const action = role.is_active ? "deactivate" : "activate";
    if (
      !window.confirm(
        `Are you sure you want to ${action} the ${role.role_name} role?`,
      )
    )
      return;
    try {
      const response = await fetch("/api/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_id: role.role_id,
          is_active: !role.is_active,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(
          result.message || "The role could not be saved. Please try again.",
        );
      await loadRoles();
      setSuccess(result.message);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to connect to the server. Please try again.",
      );
    }
  }
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Roles</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage system roles and their active status.
            </p>
          </div>
          <button
            type="button"
            onClick={openNew}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + Add Role
          </button>
        </div>
        {success && (
          <Notice
            type="success"
            message={success}
            onClose={() => setSuccess("")}
          />
        )}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search roles..."
              className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          {loading && (
            <div className="p-12 text-center text-sm text-gray-500">
              Loading roles...
            </div>
          )}
          {!loading && error && (
            <div className="p-12 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => void loadRoles()}
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
                    <th className="px-6 py-4 font-medium">Role Name</th>
                    <th className="px-6 py-4 font-medium">Description</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Created At</th>
                    <th className="px-6 py-4 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((role) => (
                    <tr key={role.role_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {role.role_name}
                      </td>
                      <td className="max-w-lg truncate px-6 py-4 text-gray-600">
                        {role.description ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <Status active={role.is_active} />
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(role.created_at).toLocaleDateString("en-PH")}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(role)}
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggle(role)}
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                          {role.is_active ? "Deactivate" : "Activate"}
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
                        No roles found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-5">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingId ? "Edit Role" : "Add Role"}
              </h2>
            </div>
            <form onSubmit={save}>
              <div className="space-y-5 px-6 py-6">
                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}
                <Field
                  label="Role Name"
                  required
                  value={form.role_name}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, role_name: value }))
                  }
                  maxLength={50}
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
                    maxLength={255}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                {editingId && (
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
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Active
                    </span>
                  </label>
                )}
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                <button
                  type="button"
                  onClick={close}
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
                  {saving ? "Saving..." : "Save Role"}
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
function Status({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? "inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
          : "inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
      }
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
function Notice({
  type,
  message,
  onClose,
}: {
  type: "success";
  message: string;
  onClose: () => void;
}) {
  void type;
  return (
    <div className="mb-5 flex justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
      <span>{message}</span>
      <button type="button" onClick={onClose} className="font-medium">
        Dismiss
      </button>
    </div>
  );
}
