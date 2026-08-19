"use client";
import { useEffect, useRef, useState } from "react";
type Role = { role_id: string; role_name: string; is_active: boolean };
type Perm = {
  permission_id: string;
  permission_code: string;
  permission_name: string;
  description: string | null;
  assigned: boolean;
};
type Module = {
  module_id: string;
  module_code: string;
  module_name: string;
  permissions: Perm[];
};
export default function RolePermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]),
    [roleId, setRoleId] = useState(""),
    [modules, setModules] = useState<Module[]>([]),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState("");
  async function loadRoles() {
    const r = await fetch("/api/roles"),
      x = await r.json();
    if (r.ok && x.success) setRoles(x.data.filter((v: Role) => v.is_active));
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void loadRoles(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function load(id: string) {
    setRoleId(id);
    setMessage("");
    if (!id) {
      setModules([]);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`/api/role-permissions?role_id=${id}`),
        x = await r.json();
      if (!r.ok || !x.success) throw new Error(x.message);
      setModules(x.modules);
      setSelected(
        new Set(
          x.modules.flatMap((m: Module) =>
            m.permissions.filter((p) => p.assigned).map((p) => p.permission_id),
          ),
        ),
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to load role permissions.",
      );
    } finally {
      setLoading(false);
    }
  }
  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function moduleToggle(m: Module, checked: boolean) {
    setSelected((s) => {
      const n = new Set(s);
      m.permissions.forEach((p) =>
        checked ? n.add(p.permission_id) : n.delete(p.permission_id),
      );
      return n;
    });
  }
  function allToggle(checked: boolean) {
    setSelected(
      checked
        ? new Set(
            modules.flatMap((m) => m.permissions.map((p) => p.permission_id)),
          )
        : new Set(),
    );
  }
  async function save() {
    if (!roleId) return;
    setSaving(true);
    try {
      const r = await fetch("/api/role-permissions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role_id: roleId,
            permission_ids: [...selected],
          }),
        }),
        x = await r.json();
      if (!r.ok || !x.success) throw new Error(x.message);
      setMessage(x.message);
      await load(roleId);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to save role permissions.",
      );
    } finally {
      setSaving(false);
    }
  }
  const all = modules.flatMap((m) => m.permissions);
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold text-gray-900">
          Role Permission Management
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Assign system permissions to each user role.
        </p>
        <div className="mt-6 rounded-xl border bg-white p-5">
          <label className="block text-sm font-medium">
            Role
            <select
              value={roleId}
              onChange={(e) => void load(e.target.value)}
              className="mt-2 w-full max-w-md rounded-lg border px-4 py-2.5"
            >
              <option value="">Select Role</option>
              {roles.map((r) => (
                <option key={r.role_id} value={r.role_id}>
                  {r.role_name}
                </option>
              ))}
            </select>
          </label>
          {roleId && (
            <label className="mt-5 flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={all.length > 0 && selected.size === all.length}
                onChange={(e) => allToggle(e.target.checked)}
              />{" "}
              Select All Permissions
            </label>
          )}
        </div>
        {message && (
          <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
            {message}
          </div>
        )}
        {loading && (
          <div className="p-12 text-center">Loading permissions...</div>
        )}
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {modules.map((m) => (
            <section key={m.module_id} className="rounded-xl border bg-white">
              <div className="flex items-center justify-between border-b border-gray-200 p-4">
                <div>
                  <h2 className="font-semibold">{m.module_name}</h2>
                  <p className="text-xs text-gray-500">{m.module_code}</p>
                </div>
                <Check
                  checked={m.permissions.every((p) =>
                    selected.has(p.permission_id),
                  )}
                  partial={m.permissions.some((p) =>
                    selected.has(p.permission_id),
                  )}
                  onChange={(v) => moduleToggle(m, v)}
                  label="Select All"
                />
              </div>
              <div className="space-y-3 p-4">
                {m.permissions.map((p) => (
                  <label key={p.permission_id} className="flex gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.has(p.permission_id)}
                      onChange={() => toggle(p.permission_id)}
                    />
                    <span>
                      <b>{p.permission_name}</b>
                      <small className="block text-gray-500">
                        {p.permission_code}
                        {p.description ? ` — ${p.description}` : ""}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
        {roleId && (
          <div className="mt-6 flex justify-end">
            <button
              disabled={saving}
              onClick={() => void save()}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Permissions"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
function Check({
  checked,
  partial,
  onChange,
  label,
}: {
  checked: boolean;
  partial: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = partial && !checked;
  }, [partial, checked]);
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
