"use client";

import { useEffect, useMemo, useState } from "react";

interface DueDateRule {
  rule_id: string;
  rule_name: string;
  rule_type: string;
  days_after_billing: number | null;
  fixed_day: number | null;
  description: string | null;
  is_active: boolean;
}

interface DueDateRuleForm {
  rule_name: string;
  rule_type: string;
  days_after_billing: string;
  fixed_day: string;
  description: string;
  is_active: boolean;
}

const emptyForm: DueDateRuleForm = {
  rule_name: "",
  rule_type: "",
  days_after_billing: "",
  fixed_day: "",
  description: "",
  is_active: true,
};

export default function DueDateRulesPage() {
  const [rules, setRules] = useState<DueDateRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<DueDateRuleForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/due-date-rules");
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Failed to load due date rules.");
      setRules(result.data);
    } catch (error) {
      console.error("Due date rules loading failed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load due date rules.",
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredRules = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rules.filter((rule) => {
      const matchesSearch =
        !query ||
        rule.rule_name.toLowerCase().includes(query) ||
        rule.rule_type.toLowerCase().includes(query) ||
        (rule.description ?? "").toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && rule.is_active) ||
        (statusFilter === "inactive" && !rule.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [rules, search, statusFilter]);

  function updateForm(field: keyof DueDateRuleForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }
  function openAddModal() {
    setEditingRuleId(null);
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
  function handleEditRule(rule: DueDateRule) {
    setEditingRuleId(rule.rule_id);
    setForm({
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      days_after_billing:
        rule.days_after_billing === null ? "" : String(rule.days_after_billing),
      fixed_day: rule.fixed_day === null ? "" : String(rule.fixed_day),
      description: rule.description ?? "",
      is_active: rule.is_active,
    });
    setFormError("");
    setShowModal(true);
  }
  async function handleSaveRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const editing = editingRuleId !== null;
      const response = await fetch("/api/due-date-rules", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { rule_id: editingRuleId } : {}),
          rule_name: form.rule_name.trim(),
          rule_type: form.rule_type.trim(),
          days_after_billing: form.days_after_billing.trim() || null,
          fixed_day: form.fixed_day.trim() || null,
          description: form.description.trim() || null,
          is_active: form.is_active,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Unable to save due date rule.");
      await loadRules();
      setForm({ ...emptyForm });
      setEditingRuleId(null);
      setShowModal(false);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to save due date rule.",
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
              Due Date Rules
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage due-date calculation rules for billing.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + Add Due Date Rule
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search due date rules..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 lg:max-w-md"
              />
              <div className="flex gap-3">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
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
              Loading due date rules...
            </div>
          )}
          {!loading && error && (
            <div className="p-12 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={loadRules}
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
                    <th className="px-6 py-4 font-medium">Rule Name</th>
                    <th className="px-6 py-4 font-medium">Rule Type</th>
                    <th className="px-6 py-4 text-right font-medium">
                      Days After Billing
                    </th>
                    <th className="px-6 py-4 text-right font-medium">
                      Fixed Day
                    </th>
                    <th className="px-6 py-4 font-medium">Description</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRules.map((rule) => (
                    <tr key={rule.rule_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {rule.rule_name}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {rule.rule_type}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {rule.days_after_billing ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {rule.fixed_day ?? "—"}
                      </td>
                      <td className="max-w-sm truncate px-6 py-4 text-gray-600">
                        {rule.description ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={
                            rule.is_active
                              ? "inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
                              : "inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                          }
                        >
                          {rule.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleEditRule(rule)}
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredRules.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-sm text-gray-500"
                      >
                        No due date rules found.
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
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingRuleId ? "Edit Due Date Rule" : "Add Due Date Rule"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Define a due-date calculation rule.
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
            <form onSubmit={handleSaveRule}>
              <div className="space-y-5 px-6 py-6">
                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}
                <div className="grid gap-5 md:grid-cols-2">
                  <FormInput
                    label="Rule Name"
                    value={form.rule_name}
                    onChange={(value) => updateForm("rule_name", value)}
                    required
                  />
                  <FormInput
                    label="Rule Type"
                    value={form.rule_type}
                    onChange={(value) => updateForm("rule_type", value)}
                    placeholder="e.g. DAYS_AFTER_BILLING"
                    required
                  />
                  <FormInput
                    label="Days After Billing"
                    type="number"
                    value={form.days_after_billing}
                    onChange={(value) =>
                      updateForm("days_after_billing", value)
                    }
                    min="0"
                    step="1"
                  />
                  <FormInput
                    label="Fixed Day"
                    type="number"
                    value={form.fixed_day}
                    onChange={(value) => updateForm("fixed_day", value)}
                    min="1"
                    max="31"
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
                    Active Due Date Rule
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
                  {saving ? "Saving..." : "Save Due Date Rule"}
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
