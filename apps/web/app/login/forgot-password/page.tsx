import ForgotPasswordForm from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-md">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          LGU District Water
        </p>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
