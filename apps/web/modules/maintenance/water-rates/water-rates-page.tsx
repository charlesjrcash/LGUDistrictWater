"use client";

import { useEffect, useMemo, useState } from "react";

interface WaterRate {
  rate_id: string;
  classification_id: string;
  classification_name: string;
  meter_size_id: string;
  meter_size: string;
  minimum_cubic_meter: string;
  maximum_cubic_meter: string | null;
  rate_type: string;
  rate_amount: string;
  effective_date: string;
  expiration_date: string | null;
  description: string | null;
  is_active: boolean;
}

interface CustomerClassification {
  classification_id: string;
  classification_name: string;
}

interface MeterSize {
  meter_size_id: string;
  meter_size: string;
}

export default function WaterRatesPage() {
  const [rates, setRates] = useState<WaterRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [customerClassifications, setCustomerClassifications] = useState<
    CustomerClassification[]
  >([]);

  const [meterSizesMaster, setMeterSizesMaster] = useState<MeterSize[]>([]);

  const [, setOptionsLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);

  const [form, setForm] = useState({
    classification_id: "",
    meter_size_id: "",
    minimum_cubic_meter: "",
    maximum_cubic_meter: "",
    rate_type: "PER_CU_M",
    rate_amount: "",
    effective_date: "2026-01-01",
    expiration_date: "",
    description: "",
    is_active: true,
  });

  function handleEditRate(rate: WaterRate) {
    setFormError("");

    setEditingRateId(rate.rate_id);

    setForm({
      classification_id: rate.classification_id,
      meter_size_id: rate.meter_size_id,
      minimum_cubic_meter: rate.minimum_cubic_meter,
      maximum_cubic_meter: rate.maximum_cubic_meter ?? "",
      rate_type: rate.rate_type,
      rate_amount: rate.rate_amount,
      effective_date: rate.effective_date,
      expiration_date: rate.expiration_date ?? "",
      description: rate.description ?? "",
      is_active: rate.is_active,
    });

    setShowModal(true);
  }

  async function loadWaterRateOptions() {
    try {
      setOptionsLoading(true);

      const response = await fetch("/api/water-rate-options");

      if (!response.ok) {
        throw new Error("Failed to load classifications and meter sizes.");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to load water rate options.");
      }

      setCustomerClassifications(result.classifications);

      setMeterSizesMaster(result.meterSizes);
    } catch (error) {
      console.error("Water rate options loading failed:", error);

      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to load classifications and meter sizes.",
      );
    } finally {
      setOptionsLoading(false);
    }
  }

  async function handleSaveRate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setFormError("");
    setSaving(true);

    try {
      const url = editingRateId
        ? `/api/water-rates/${editingRateId}`
        : "/api/water-rates";

      const method = editingRateId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classification_id: Number(form.classification_id),

          meter_size_id: Number(form.meter_size_id),

          minimum_cubic_meter: Number(form.minimum_cubic_meter),

          maximum_cubic_meter:
            form.maximum_cubic_meter === ""
              ? null
              : Number(form.maximum_cubic_meter),

          rate_type: form.rate_type,

          rate_amount: Number(form.rate_amount),

          effective_date: form.effective_date,

          expiration_date:
            form.expiration_date === "" ? null : form.expiration_date,

          description:
            form.description.trim() === "" ? null : form.description.trim(),

          is_active: form.is_active,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            (editingRateId
              ? "Unable to update water rate."
              : "Unable to save water rate."),
        );
      }

      await loadWaterRates();

      setForm({
        classification_id: "",
        meter_size_id: "",
        minimum_cubic_meter: "",
        maximum_cubic_meter: "",
        rate_type: "PER_CU_M",
        rate_amount: "",
        effective_date: "2026-01-01",
        expiration_date: "",
        description: "",
        is_active: true,
      });

      setEditingRateId(null);

      setShowModal(false);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to save water rate.",
      );
    } finally {
      setSaving(false);
    }
  }

  // Search and filters
  const [search, setSearch] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("all");
  const [meterSizeFilter, setMeterSizeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWaterRates();
      void loadWaterRateOptions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function loadWaterRates() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/water-rates");

      if (!response.ok) {
        throw new Error("Failed to load water rates.");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to load water rates.");
      }

      setRates(result.data);
    } catch (error) {
      console.error("Water rates loading failed:", error);

      setError(
        error instanceof Error ? error.message : "Unable to load water rates.",
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Get unique classifications from the records.
   *
   * Example:
   * Residential
   * Commercial
   */
  const classifications = useMemo(() => {
    const values = rates.map((rate) => rate.classification_name);

    return [...new Set(values)].sort();
  }, [rates]);

  /*
   * Get unique meter sizes from the records.
   *
   * Example:
   * 1/2 inch
   * 3/4 inch
   * 1 inch
   */
  const meterSizes = useMemo(() => {
    const values = rates.map((rate) => rate.meter_size);

    return [...new Set(values)].sort();
  }, [rates]);

  /*
   * Apply all filters.
   */
  const filteredRates = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return rates.filter((rate) => {
      /*
       * SEARCH
       *
       * Search classification, meter size,
       * rate type, description and amount.
       */
      const matchesSearch =
        !searchValue ||
        rate.classification_name.toLowerCase().includes(searchValue) ||
        rate.meter_size.toLowerCase().includes(searchValue) ||
        rate.rate_type.toLowerCase().includes(searchValue) ||
        (rate.description ?? "").toLowerCase().includes(searchValue) ||
        rate.rate_amount.includes(searchValue);

      /*
       * CLASSIFICATION
       */
      const matchesClassification =
        classificationFilter === "all" ||
        rate.classification_name === classificationFilter;

      /*
       * METER SIZE
       */
      const matchesMeterSize =
        meterSizeFilter === "all" || rate.meter_size === meterSizeFilter;

      /*
       * STATUS
       */
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && rate.is_active) ||
        (statusFilter === "inactive" && !rate.is_active);

      return (
        matchesSearch &&
        matchesClassification &&
        matchesMeterSize &&
        matchesStatus
      );
    });
  }, [rates, search, classificationFilter, meterSizeFilter, statusFilter]);

  /*
   * Reset all filters.
   */
  function resetFilters() {
    setSearch("");
    setClassificationFilter("all");
    setMeterSizeFilter("all");
    setStatusFilter("active");
  }

  /*
   * Format consumption range.
   *
   * 0 - 10 m³
   * 11 - 20 m³
   * 21+ m³
   */
  function formatConsumption(minimum: string, maximum: string | null) {
    const min = Number(minimum);

    if (maximum === null) {
      return `${min}+ m³`;
    }

    return `${min} - ${Number(maximum)} m³`;
  }

  /*
   * Format rate amount.
   */
  function formatRate(rate: string) {
    return `₱${Number(rate).toFixed(2)}`;
  }

  /*
   * Format PostgreSQL date.
   *
   * Example:
   * 2026-01-01
   * becomes
   * 01/01/2026
   */
  function formatDate(date: string) {
    if (!date) {
      return "—";
    }

    const [year, month, day] = date.split("-");

    return `${month}/${day}/${year}`;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* PAGE HEADER */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              Water Rates
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage water consumption rates and effective periods.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingRateId(null);
              setFormError("");

              setForm({
                classification_id: "",
                meter_size_id: "",
                minimum_cubic_meter: "",
                maximum_cubic_meter: "",
                rate_type: "PER_CU_M",
                rate_amount: "",
                effective_date: "2026-01-01",
                expiration_date: "",
                description: "",
                is_active: true,
              });

              setShowModal(true);
            }}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + Add Rate
          </button>
        </div>

        {/* MAIN CARD */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* TOOLBAR */}
          <div className="border-b border-gray-200 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* SEARCH */}
              <div className="relative w-full lg:max-w-md">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search water rates..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* FILTERS */}
              <div className="flex flex-wrap gap-3">
                {/* CLASSIFICATION */}
                <select
                  value={classificationFilter}
                  onChange={(event) =>
                    setClassificationFilter(event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="all">All Classifications</option>

                  {classifications.map((classification) => (
                    <option key={classification} value={classification}>
                      {classification}
                    </option>
                  ))}
                </select>

                {/* METER SIZE */}
                <select
                  value={meterSizeFilter}
                  onChange={(event) => setMeterSizeFilter(event.target.value)}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="all">All Meter Sizes</option>

                  {meterSizes.map((meterSize) => (
                    <option key={meterSize} value={meterSize}>
                      {meterSize}
                    </option>
                  ))}
                </select>

                {/* STATUS */}
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="active">Active</option>

                  <option value="inactive">Inactive</option>

                  <option value="all">All Status</option>
                </select>

                {/* RESET */}
                {(search ||
                  classificationFilter !== "all" ||
                  meterSizeFilter !== "all" ||
                  statusFilter !== "active") && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* LOADING */}
          {loading && (
            <div className="p-12 text-center text-sm text-gray-500">
              Loading water rates...
            </div>
          )}

          {/* ERROR */}
          {!loading && error && (
            <div className="p-12 text-center">
              <p className="text-sm text-red-600">{error}</p>

              <button
                type="button"
                onClick={loadWaterRates}
                className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
              >
                Try Again
              </button>
            </div>
          )}

          {/* TABLE */}
          {!loading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">Classification</th>

                      <th className="px-6 py-4 font-medium">Meter Size</th>

                      <th className="px-6 py-4 font-medium">Consumption</th>

                      <th className="px-6 py-4 font-medium">Rate Type</th>

                      <th className="px-6 py-4 text-right font-medium">Rate</th>

                      <th className="px-6 py-4 font-medium">Effective Date</th>

                      <th className="px-6 py-4 font-medium">Status</th>

                      <th className="px-6 py-4 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredRates.map((rate) => (
                      <tr key={rate.rate_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {rate.classification_name}
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {rate.meter_size}
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {formatConsumption(
                            rate.minimum_cubic_meter,
                            rate.maximum_cubic_meter,
                          )}
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {rate.rate_type === "PER_CU_M"
                            ? "Per m³"
                            : rate.rate_type}
                        </td>

                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          {formatRate(rate.rate_amount)}
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {formatDate(rate.effective_date)}
                        </td>

                        <td className="px-6 py-4">
                          {rate.is_active ? (
                            <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                              Inactive
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleEditRate(rate)}
                            className="rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* NO RESULTS */}
              {filteredRates.length === 0 && (
                <div className="border-t border-gray-100 p-12 text-center">
                  <p className="text-sm font-medium text-gray-700">
                    No water rates found.
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Try changing your search or filters.
                  </p>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Reset filters
                  </button>
                </div>
              )}

              {/* FOOTER */}
              <div className="border-t border-gray-200 px-6 py-4">
                <p className="text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-medium text-gray-900">
                    {filteredRates.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-900">
                    {rates.length}
                  </span>{" "}
                  {rates.length === 1 ? "record" : "records"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingRateId ? "Edit Water Rate" : "Add Water Rate"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {editingRateId
                    ? "Update the selected water rate."
                    : "Define the consumption rate and effective period."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="rounded-lg px-3 py-2 text-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleSaveRate}>
              <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
                {/* CLASSIFICATION */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Classification
                  </label>

                  <select
                    value={form.classification_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        classification_id: e.target.value,
                      })
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select classification</option>

                    {customerClassifications.map((classification) => (
                      <option
                        key={classification.classification_id}
                        value={classification.classification_id}
                      >
                        {classification.classification_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* METER SIZE */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Meter Size
                  </label>

                  <select
                    value={form.meter_size_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        meter_size_id: e.target.value,
                      })
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select meter size</option>

                    {meterSizesMaster.map((meterSize) => (
                      <option
                        key={meterSize.meter_size_id}
                        value={meterSize.meter_size_id}
                      >
                        {meterSize.meter_size}
                      </option>
                    ))}
                  </select>
                </div>

                {/* MINIMUM */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Minimum Consumption (m³)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.minimum_cubic_meter}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        minimum_cubic_meter: e.target.value,
                      })
                    }
                    required
                    placeholder="e.g. 0"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* MAXIMUM */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Maximum Consumption (m³)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.maximum_cubic_meter}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        maximum_cubic_meter: e.target.value,
                      })
                    }
                    placeholder="Leave blank for 21+"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    Leave blank when there is no upper limit.
                  </p>
                </div>

                {/* RATE TYPE */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Rate Type
                  </label>

                  <select
                    value={form.rate_type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        rate_type: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="PER_CU_M">Per Cubic Meter</option>

                    <option value="FLAT_RATE">Flat Rate</option>
                  </select>
                </div>

                {/* RATE AMOUNT */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Rate Amount (₱)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.rate_amount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        rate_amount: e.target.value,
                      })
                    }
                    required
                    placeholder="e.g. 35.00"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* EFFECTIVE DATE */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Effective Date
                  </label>

                  <input
                    type="date"
                    value={form.effective_date}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        effective_date: e.target.value,
                      })
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* EXPIRATION DATE */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Expiration Date
                  </label>

                  <input
                    type="date"
                    value={form.expiration_date}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        expiration_date: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    Optional. Leave blank if the rate remains effective.
                  </p>
                </div>

                {/* DESCRIPTION */}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Description
                  </label>

                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Optional description or notes..."
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* ACTIVE */}
                <div className="md:col-span-2">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          is_active: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />

                    <span className="text-sm font-medium text-gray-700">
                      Active Rate
                    </span>
                  </label>
                </div>

                {/* ERROR */}
                {formError && (
                  <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingRateId
                      ? "Update Rate"
                      : "Save Rate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
