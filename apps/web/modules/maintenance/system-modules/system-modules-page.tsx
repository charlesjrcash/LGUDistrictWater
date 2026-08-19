"use client";
import { useEffect, useMemo, useState } from "react";
type M = {
  module_id: string;
  module_code: string;
  module_name: string;
  route_path: string | null;
  description: string | null;
  parent_module_id: string | null;
  parent_module_name: string | null;
  sort_order: number;
  is_active: boolean;
};
type F = {
  module_code: string;
  module_name: string;
  route_path: string;
  description: string;
  parent_module_id: string;
  sort_order: string;
  is_active: boolean;
};
const empty: F = {
  module_code: "",
  module_name: "",
  route_path: "",
  description: "",
  parent_module_id: "",
  sort_order: "0",
  is_active: true,
};
export default function SystemModulesPage() {
  const [items, setItems] = useState<M[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [modal, setModal] = useState(false),
    [id, setId] = useState<string | null>(null),
    [form, setForm] = useState<F>(empty),
    [formError, setFormError] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    void load();
  }, []);
  async function load() {
    try {
      setLoading(true);
      const r = await fetch("/api/system-modules?all=true"),
        x = await r.json();
      if (!r.ok || !x.success) throw new Error(x.message);
      setItems(x.data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load system modules.",
      );
    } finally {
      setLoading(false);
    }
  }
  const filtered = useMemo(() => {
    const v = search.toLowerCase();
    return items.filter(
      (m) =>
        (!v ||
          m.module_code.toLowerCase().includes(v) ||
          m.module_name.toLowerCase().includes(v) ||
          (m.route_path ?? "").toLowerCase().includes(v)) &&
        (status === "all" ||
          (status === "active" && m.is_active) ||
          (status === "inactive" && !m.is_active)),
    );
  }, [items, search, status]);
  function open(m?: M) {
    setId(m?.module_id ?? null);
    setForm(
      m
        ? {
            module_code: m.module_code,
            module_name: m.module_name,
            route_path: m.route_path ?? "",
            description: m.description ?? "",
            parent_module_id: m.parent_module_id ?? "",
            sort_order: String(m.sort_order),
            is_active: m.is_active,
          }
        : { ...empty },
    );
    setFormError("");
    setModal(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.module_code.trim() || !form.module_name.trim())
      return setFormError("Module code and module name are required.");
    setSaving(true);
    try {
      const r = await fetch("/api/system-modules", {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            module_id: id,
            parent_module_id: form.parent_module_id || null,
            route_path: form.route_path || null,
            description: form.description || null,
            sort_order: form.sort_order,
          }),
        }),
        x = await r.json();
      if (!r.ok || !x.success) throw new Error(x.message);
      await load();
      setSuccess(x.message);
      setModal(false);
    } catch (c) {
      setFormError(
        c instanceof Error
          ? c.message
          : "The module could not be saved. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function toggle(m: M) {
    if (
      !window.confirm(
        `Are you sure you want to ${m.is_active ? "deactivate" : "activate"} this module?`,
      )
    )
      return;
    const r = await fetch("/api/system-modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_id: m.module_id,
          is_active: !m.is_active,
        }),
      }),
      x = await r.json();
    if (r.ok && x.success) {
      await load();
      setSuccess(x.message);
    } else setError(x.message);
  }
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              System Modules
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage the system modules, navigation pages, and functional areas.
            </p>
          </div>
          <button
            onClick={() => open()}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white"
          >
            + Add Module
          </button>
        </div>
        {success && (
          <div className="mb-5 rounded-lg bg-green-50 p-3 text-green-700">
            {success}
          </div>
        )}
        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="flex gap-3 border-b border-gray-200 p-5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search modules..."
              className="w-full max-w-md rounded-lg border px-4 py-2.5"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border px-4"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {loading ? (
            <div className="p-12 text-center">Loading system modules...</div>
          ) : error ? (
            <div className="p-12 text-red-600">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-6 py-4">Module Code</th>
                    <th className="px-6 py-4">Module Name</th>
                    <th className="px-6 py-4">Route</th>
                    <th className="px-6 py-4">Parent Module</th>
                    <th className="px-6 py-4">Sort Order</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((m) => (
                    <tr key={m.module_id}>
                      <td className="px-6 py-4 font-medium">{m.module_code}</td>
                      <td className="px-6 py-4">{m.module_name}</td>
                      <td className="px-6 py-4">{m.route_path ?? "—"}</td>
                      <td className="px-6 py-4">
                        {m.parent_module_name ?? "—"}
                      </td>
                      <td className="px-6 py-4">{m.sort_order}</td>
                      <td className="px-6 py-4">
                        {m.is_active ? "Active" : "Inactive"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => open(m)}
                          className="px-3 text-blue-600"
                        >
                          Edit
                        </button>
                        <button onClick={() => void toggle(m)} className="px-3">
                          {m.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={save}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white"
          >
            <div className="border-b border-gray-200 p-5 text-xl font-semibold">
              {id ? "Edit Module" : "Add Module"}
            </div>
            <div className="space-y-4 p-6">
              {formError && (
                <div className="rounded bg-red-50 p-3 text-red-700">
                  {formError}
                </div>
              )}
              <Input
                label="Module Code"
                value={form.module_code}
                set={(v) => setForm((f) => ({ ...f, module_code: v }))}
              />
              <Input
                label="Module Name"
                value={form.module_name}
                set={(v) => setForm((f) => ({ ...f, module_name: v }))}
              />
              <Input
                label="Route Path"
                value={form.route_path}
                set={(v) => setForm((f) => ({ ...f, route_path: v }))}
              />
              <select
                value={form.parent_module_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, parent_module_id: e.target.value }))
                }
                className="w-full rounded border px-4 py-2.5"
              >
                <option value="">No Parent Module</option>
                {items
                  .filter((m) => m.is_active && m.module_id !== id)
                  .map((m) => (
                    <option key={m.module_id} value={m.module_id}>
                      {m.module_name}
                    </option>
                  ))}
              </select>
              <Input
                label="Sort Order"
                value={form.sort_order}
                set={(v) => setForm((f) => ({ ...f, sort_order: v }))}
              />
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Description"
                className="w-full rounded border px-4 py-2.5"
              />
              {id && (
                <label>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, is_active: e.target.checked }))
                    }
                  />{" "}
                  Active
                </label>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t p-4">
              <button type="button" onClick={() => setModal(false)}>
                Cancel
              </button>
              <button
                disabled={saving}
                className="rounded bg-blue-600 px-5 py-2.5 text-white"
              >
                {saving ? "Saving..." : "Save Module"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
function Input({
  label,
  value,
  set,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
}) {
  return (
    <label className="block">
      {label}
      <input
        value={value}
        onChange={(e) => set(e.target.value)}
        className="mt-1 w-full rounded border px-4 py-2.5"
      />
    </label>
  );
}
