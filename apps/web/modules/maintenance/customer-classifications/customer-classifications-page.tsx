"use client";
import { useEffect, useState } from "react";
type C = {
  classification_id: string;
  classification_code: string;
  classification_name: string;
  description: string | null;
  is_active: boolean;
};
type F = {
  classification_code: string;
  classification_name: string;
  description: string;
  is_active: boolean;
};
const empty: F = {
  classification_code: "",
  classification_name: "",
  description: "",
  is_active: true,
};
export default function CustomerClassificationsPage() {
  const [items, setItems] = useState<C[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [id, setId] = useState<string | null>(null),
    [form, setForm] = useState<F>(empty),
    [modal, setModal] = useState(false),
    [formError, setFormError] = useState("");
  async function load() {
    try {
      setLoading(true);
      const r = await fetch("/api/customer-classifications"),
        d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.message);
      setItems(d.data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load customer classifications.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  function edit(x: C) {
    setId(x.classification_id);
    setForm({
      classification_code: x.classification_code,
      classification_name: x.classification_name,
      description: x.description ?? "",
      is_active: x.is_active,
    });
    setModal(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/customer-classifications", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(id ? { classification_id: id } : {}),
          ...form,
        }),
      }),
      d = await r.json();
    if (!r.ok || !d.success) {
      setFormError(d.message);
      return;
    }
    await load();
    setModal(false);
    setId(null);
    setForm({ ...empty });
  }
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Customer Classifications</h1>
            <p className="text-sm text-gray-500">
              Manage customer classification codes and names.
            </p>
          </div>
          <button
            onClick={() => {
              setId(null);
              setForm({ ...empty });
              setFormError("");
              setModal(true);
            }}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-white"
          >
            + Add Customer Classification
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border bg-white">
          {loading ? (
            <p className="p-12 text-center">
              Loading customer classifications...
            </p>
          ) : error ? (
            <p className="p-12 text-center text-red-600">{error}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  {[
                    "Classification Code",
                    "Classification Name",
                    "Description",
                    "Status",
                    "Actions",
                  ].map((x) => (
                    <th key={x} className="px-6 py-4 text-left">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((x) => (
                  <tr key={x.classification_id} className="border-t">
                    <td className="p-4 font-medium">{x.classification_code}</td>
                    <td className="p-4">{x.classification_name}</td>
                    <td className="p-4">{x.description ?? "—"}</td>
                    <td className="p-4">
                      {x.is_active ? "Active" : "Inactive"}
                    </td>
                    <td className="p-4">
                      <button onClick={() => edit(x)} className="text-blue-600">
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
      {modal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={save}
            className="w-full max-w-xl rounded-xl bg-white p-6 space-y-4"
          >
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-semibold">
                {id ? "Edit" : "Add"} Customer Classification
              </h2>
              <button
                type="button"
                onClick={() => setModal(false)}
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
            {formError && <p className="text-red-600">{formError}</p>}
            <input
              required
              value={form.classification_code}
              onChange={(e) =>
                setForm({ ...form, classification_code: e.target.value })
              }
              placeholder="Classification Code"
              className="w-full rounded border p-2"
            />
            <input
              required
              value={form.classification_name}
              onChange={(e) =>
                setForm({ ...form, classification_name: e.target.value })
              }
              placeholder="Classification Name"
              className="w-full rounded border p-2"
            />
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Description"
              className="w-full rounded border p-2"
            />
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />
              Active Classification
            </label>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setModal(false)}>
                Cancel
              </button>
              <button className="rounded bg-blue-600 px-4 py-2 text-white">
                Save Classification
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
