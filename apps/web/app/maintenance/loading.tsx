export default function MaintenanceLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-8 py-10" aria-busy="true">
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-9 w-72 rounded bg-slate-200" />
        <div className="h-14 rounded-xl bg-slate-200" />
        <div className="h-96 rounded-xl bg-slate-200" />
      </div>
    </main>
  );
}
