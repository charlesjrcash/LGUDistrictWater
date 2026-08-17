import RegistrationForm from "./registration-form";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">LGU District Water</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Create a user account</h1>
          <p className="mt-2 text-slate-600">Enter the employee details and assign their system access role.</p>
        </div>
        <RegistrationForm />
      </div>
    </main>
  );
}
