"use client";

export default function MaintenanceError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Unable to load maintenance data
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          An unexpected problem interrupted this page. No maintenance record was
          changed.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
