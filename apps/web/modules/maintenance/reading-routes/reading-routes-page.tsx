"use client";
import { useEffect, useMemo, useState } from "react";
type Route = {
  route_id: string;
  route_code: string;
  route_name: string;
  barangay_id: string | null;
  barangay_name: string | null;
  sequence_no: number | null;
  description: string | null;
  is_active: boolean;
  employee_id: string | null;
  employeeName: string | null;
};
type Barangay = {
  barangay_id: string;
  barangay_name: string;
  is_active: boolean;
};
type Employee = { employee_id: string; employee_name: string; position: string | null; is_active: boolean };
type Form = {
  route_code: string;
  route_name: string;
  barangay_id: string;
  sequence_no: string;
  description: string;
  is_active: boolean;
  employee_id: string;
};
const empty: Form = {
  route_code: "",
  route_name: "",
  barangay_id: "",
  sequence_no: "",
  description: "",
  is_active: true,
  employee_id: "",
};
export default function ReadingRoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]),
    [barangays, setBarangays] = useState<Barangay[]>([]),
    [employees, setEmployees] = useState<Employee[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [editing, setEditing] = useState<string | null>(null),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("active"),
    [open, setOpen] = useState(false),
    [form, setForm] = useState<Form>(empty),
    [formError, setFormError] = useState(""),
    [saving, setSaving] = useState(false);
  async function load() {
    try {
      setLoading(true);
      setError("");
      const [a, b, c] = await Promise.all([
        fetch("/api/reading-routes"),
        fetch("/api/barangays"),
        fetch("/api/employee"),
      ]);
      const [ar, br, cr] = await Promise.all([a.json(), b.json(), c.json()]);
      if (!a.ok || !ar.success)
        throw new Error(ar.message || "Failed to load reading routes.");
      if (!b.ok || !br.success)
        throw new Error(br.message || "Failed to load barangays.");
      if (!c.ok || !cr.success)
        throw new Error(cr.message || "Failed to load meter readers.");
      setRoutes(ar.data);
      setBarangays(br.data);
      setEmployees(cr.data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load reading routes.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return routes.filter(
      (r) =>
        (!q ||
          r.route_code.toLowerCase().includes(q) ||
          r.route_name.toLowerCase().includes(q) ||
          (r.barangay_name ?? "").toLowerCase().includes(q) ||
          (r.employeeName ?? "").toLowerCase().includes(q)) &&
        (status === "all" ||
          (status === "active" && r.is_active) ||
          (status === "inactive" && !r.is_active)),
    );
  }, [routes, search, status]);
  function update(k: keyof Form, v: string | boolean) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function add() {
    setEditing(null);
    setForm({ ...empty });
    setFormError("");
    setOpen(true);
  }
  function edit(r: Route) {
    setEditing(r.route_id);
    setForm({
      route_code: r.route_code,
      route_name: r.route_name,
      barangay_id: r.barangay_id ?? "",
      sequence_no: r.sequence_no === null ? "" : String(r.sequence_no),
      description: r.description ?? "",
      is_active: r.is_active,
      employee_id: r.employee_id ?? "",
    });
    setFormError("");
    setOpen(true);
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const r = await fetch("/api/reading-routes", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { route_id: editing } : {}),
          route_code: form.route_code,
          route_name: form.route_name,
          barangay_id: form.barangay_id || null,
          sequence_no: form.sequence_no || null,
          description: form.description || null,
          is_active: form.is_active,
          employee_id: form.employee_id || null,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.success)
        throw new Error(d.message || "Unable to save reading route.");
      await load();
      setOpen(false);
      setEditing(null);
      setForm({ ...empty });
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : "Unable to save reading route.",
      );
    } finally {
      setSaving(false);
    }
  }
  const options = barangays.filter(
    (b) => b.is_active || b.barangay_id === form.barangay_id,
  );
  const readers = employees.filter((employee) => employee.is_active && employee.position?.trim().toLowerCase() === "meter reader");
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              Reading Routes
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage meter-reading routes and barangay assignments.
            </p>
          </div>
          <button
            onClick={add}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white"
          >
            + Add Reading Route
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex gap-3 border-b border-gray-200 p-5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reading routes..."
              className="w-full rounded-lg border px-4 py-2.5 text-sm"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border px-4 py-2.5 text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All Status</option>
            </select>
          </div>
          {loading ? (
            <div className="p-12 text-center text-sm text-gray-500">
              Loading reading routes...
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-600">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    {[
                      "Route Code",
                      "Route Name",
                      "Barangay",
                      "Sequence",
                      "Description",
                      "Meter Reader",
                      "Status",
                      "Actions",
                    ].map((x) => (
                      <th key={x} className="px-6 py-4 font-medium">
                        {x}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((r) => (
                    <tr key={r.route_id}>
                      <td className="px-6 py-4 font-medium">{r.route_code}</td>
                      <td className="px-6 py-4">{r.route_name}</td>
                      <td className="px-6 py-4">
                        {r.barangay_name ?? "Unassigned"}
                      </td>
                      <td className="px-6 py-4">{r.sequence_no ?? "—"}</td>
                      <td className="px-6 py-4">{r.description ?? "—"}</td>
                      <td className="px-6 py-4">{r.employeeName ?? "No Meter Reader"}</td>
                      <td className="px-6 py-4">
                        {r.is_active ? "Active" : "Inactive"}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => edit(r)}
                          className="text-blue-600"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-12 text-center text-gray-500"
                      >
                        No reading routes found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white">
            <div className="border-b border-gray-200 px-6 py-5">
              <h2 className="text-xl font-semibold">
                {editing ? "Edit Reading Route" : "Add Reading Route"}
              </h2>
            </div>
            <form onSubmit={save} className="p-6 space-y-5">
              {formError && (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">
                  {formError}
                </div>
              )}
              <Field
                label="Route Code"
                value={form.route_code}
                onChange={(v) => update("route_code", v)}
                required
              />
              <Field
                label="Route Name"
                value={form.route_name}
                onChange={(v) => update("route_name", v)}
                required
              />
              <label className="block">
                Barangay
                <select
                  value={form.barangay_id}
                  onChange={(e) => update("barangay_id", e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2"
                >
                  <option value="">-- No Barangay --</option>
                  {options.map((b) => (
                    <option key={b.barangay_id} value={b.barangay_id}>
                      {b.barangay_name}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="Sequence No."
                value={form.sequence_no}
                onChange={(v) => update("sequence_no", v)}
                type="number"
                step="1"
              />
              <label className="block">
                Meter Reader
                <select
                  value={form.employee_id}
                  onChange={(e) => update("employee_id", e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2"
                >
                  <option value="">-- No Meter Reader --</option>
                  {readers.map((employee) => (
                    <option key={employee.employee_id} value={employee.employee_id}>
                      {employee.employee_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                Description
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </label>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => update("is_active", e.target.checked)}
                />
                Active Route
              </label>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => !saving && setOpen(false)}
                  className="rounded border px-5 py-2"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className="rounded bg-blue-600 px-5 py-2 text-white"
                >
                  {saving ? "Saving..." : "Save Reading Route"}
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
  ...p
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border px-3 py-2"
        {...p}
      />
    </label>
  );
}
