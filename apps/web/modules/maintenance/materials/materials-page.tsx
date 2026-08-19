"use client";

import { useEffect, useMemo, useState } from "react";

interface Material {
  material_id: string;
  material_code: string;
  material_name: string;
  unit_id: string;
  unit_name: string | null;
  description: string | null;
  is_active: boolean;
}

interface Unit {
  unit_id: string;
  unit_name: string;
}

interface MaterialForm {
  material_code: string;
  material_name: string;
  unit_id: string;
  description: string;
  is_active: boolean;
}

const emptyForm: MaterialForm = {
  material_code: "",
  material_name: "",
  unit_id: "",
  description: "",
  is_active: true,
};

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(
    null,
  );
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<MaterialForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  useEffect(() => {
    void Promise.all([loadMaterials(), loadUnits()]);
  }, []);

  async function loadMaterials() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/materials");
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Failed to load materials.");
      setMaterials(result.data);
    } catch (caught) {
      console.error("Materials loading failed:", caught);
      setError(
        caught instanceof Error ? caught.message : "Unable to load materials.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadUnits() {
    try {
      const response = await fetch("/api/units?activeOnly=true");
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Failed to load units of measure.");
      setUnits(result.data);
    } catch (caught) {
      console.error("Units of measure loading failed:", caught);
      setError(
        (current) =>
          current ||
          (caught instanceof Error
            ? caught.message
            : "Unable to load units of measure."),
      );
    }
  }

  const filteredMaterials = useMemo(() => {
    const value = search.trim().toLowerCase();
    return materials.filter((material) => {
      const matchesSearch =
        !value ||
        material.material_code.toLowerCase().includes(value) ||
        material.material_name.toLowerCase().includes(value) ||
        (material.unit_name ?? "").toLowerCase().includes(value) ||
        (material.description ?? "").toLowerCase().includes(value);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && material.is_active) ||
        (statusFilter === "inactive" && !material.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [materials, search, statusFilter]);

  function openAddModal() {
    setEditingMaterialId(null);
    setForm({ ...emptyForm });
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;
    setShowModal(false);
    setEditingMaterialId(null);
    setForm({ ...emptyForm });
    setFormError("");
  }

  function editMaterial(material: Material) {
    setEditingMaterialId(material.material_id);
    setForm({
      material_code: material.material_code,
      material_name: material.material_name,
      unit_id: material.unit_id,
      description: material.description ?? "",
      is_active: material.is_active,
    });
    setFormError("");
    setShowModal(true);
  }

  function updateForm(field: keyof MaterialForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveMaterial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!form.material_code.trim())
      return setFormError("Material Code is required.");
    if (!form.material_name.trim())
      return setFormError("Material Name is required.");
    if (!form.unit_id) return setFormError("Unit of Measure is required.");

    setSaving(true);
    try {
      const editing = editingMaterialId !== null;
      const response = await fetch("/api/materials", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { material_id: editingMaterialId } : {}),
          material_code: form.material_code.trim(),
          material_name: form.material_name.trim(),
          unit_id: form.unit_id,
          description: form.description.trim() || null,
          is_active: form.is_active,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Unable to save material.");
      await loadMaterials();
      setSuccessMessage(result.message);
      setShowModal(false);
      setEditingMaterialId(null);
      setForm({ ...emptyForm });
    } catch (caught) {
      console.error("Material save failed:", caught);
      setFormError(
        caught instanceof Error ? caught.message : "Unable to save material.",
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
            <h1 className="text-3xl font-semibold text-gray-900">Materials</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage materials used for service installations.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + Add Material
          </button>
        </div>

        {successMessage && (
          <div className="mb-5 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <span>{successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage("")}
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
                placeholder="Search materials..."
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
              Loading materials...
            </div>
          )}
          {!loading && error && (
            <div className="p-12 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => void Promise.all([loadMaterials(), loadUnits()])}
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
                    <th className="px-6 py-4 font-medium">Material Code</th>
                    <th className="px-6 py-4 font-medium">Material Name</th>
                    <th className="px-6 py-4 font-medium">Unit</th>
                    <th className="px-6 py-4 font-medium">Description</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMaterials.map((material) => (
                    <tr key={material.material_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {material.material_code}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {material.material_name}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {material.unit_name ?? "—"}
                      </td>
                      <td className="max-w-sm truncate px-6 py-4 text-gray-600">
                        {material.description ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={
                            material.is_active
                              ? "inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
                              : "inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                          }
                        >
                          {material.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => editMaterial(material)}
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredMaterials.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-sm text-gray-500"
                      >
                        No materials found.
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
                {editingMaterialId ? "Edit Material" : "Add Material"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Fields marked with <span className="text-red-600">*</span> are
                required.
              </p>
            </div>
            <form onSubmit={saveMaterial}>
              <div className="space-y-5 px-6 py-6">
                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}
                <div className="grid gap-5 md:grid-cols-2">
                  <FormInput
                    label="Material Code"
                    required
                    value={form.material_code}
                    onChange={(value) => updateForm("material_code", value)}
                    placeholder="e.g. PVC-001"
                    maxLength={30}
                  />
                  <FormInput
                    label="Material Name"
                    required
                    value={form.material_name}
                    onChange={(value) => updateForm("material_name", value)}
                    placeholder="e.g. PVC Pipe"
                    maxLength={150}
                  />
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Unit of Measure <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={form.unit_id}
                      onChange={(event) =>
                        updateForm("unit_id", event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Select Unit of Measure</option>
                      {units.map((unit) => (
                        <option key={unit.unit_id} value={unit.unit_id}>
                          {unit.unit_name}
                        </option>
                      ))}
                    </select>
                  </div>
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
                    Active Material
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
                  {saving ? "Saving..." : "Save Material"}
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
