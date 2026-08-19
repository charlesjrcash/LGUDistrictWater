export default function TransactionsLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10" aria-busy="true">
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-9 w-64 rounded bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-xl bg-slate-200" />
          ))}
        </div>
        <div className="h-96 rounded-xl bg-slate-200" />
      </div>
    </main>
  );
}
