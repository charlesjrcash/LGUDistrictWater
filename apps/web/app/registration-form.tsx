"use client";

import { FormEvent, useEffect, useState } from "react";

const inputClass = "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
const labelClass = "block text-sm font-semibold text-slate-800";

/** Renders the shared password-visibility icon used by both credential fields. */
function EyeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.5-6 9.75-6 9.75 6 9.75 6-3.5 6-9.75 6-9.75-6-9.75-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
}

type RegistrationFormProps = {
  initialRoles: string[];
};

export default function RegistrationForm({ initialRoles }: RegistrationFormProps) {
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // The server provides roles with the initial HTML, avoiding a loading state after hydration.
  const [roles, setRoles] = useState<string[]>(initialRoles);
  const [rolesError, setRolesError] = useState<string | null>(null);

  /** Loads active role names from PostgreSQL through the server-only roles API. */
  useEffect(() => {
    // Roles are already available on the initial render. Fetch only if the
    // server could not supply them, so the client still has a recovery path.
    if (initialRoles.length > 0) return;

    let cancelled = false;

    async function loadRoles() {
      try {
        const response = await fetch("/api/roles");
        const result = (await response.json()) as { message?: string; roles?: string[] };
        if (!response.ok) throw new Error(result.message || "Unable to load system roles.");
        if (!cancelled) setRoles(result.roles || []);
      } catch (error) {
        if (!cancelled) setRolesError(error instanceof Error ? error.message : "Unable to load system roles.");
      }
    }

    void loadRoles();
    return () => { cancelled = true; };
  }, [initialRoles.length]);

  /** Sends the form values to the server route, then shows its success or error message. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setSubmitting(true);
    const form = event.currentTarget;

    try {
      // FormData preserves each input name expected by the POST /api/users route.
      const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Unable to create user.");
      form.reset();
      setStatus({ type: "success", message: result.message || "User created successfully." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Unable to create user." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 sm:px-8">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white shadow-sm" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5"><circle cx="12" cy="8" r="3.25" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 21a7 7 0 0 1 14 0" /></svg></div>
          <div><h2 className="text-base font-bold text-slate-900">User profile</h2><p className="mt-1 text-sm leading-5 text-slate-600">Set up the employee&apos;s identity, credentials, and system access.</p></div>
        </div>
      </div>

      <div className="space-y-8 px-6 py-7 sm:px-8 sm:py-8">
        <section aria-labelledby="identity-heading">
          <div className="mb-5 flex items-baseline justify-between gap-4"><div><h3 id="identity-heading" className="text-sm font-bold text-slate-900">Employee details</h3><p className="mt-1 text-sm text-slate-500">Use the employee&apos;s official information.</p></div><span className="shrink-0 text-xs text-slate-500"><span className="text-red-600">*</span> Required</span></div>
          <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
            <label className={labelClass}>Username <span className="text-red-600">*</span><input className={inputClass} name="username" required minLength={3} maxLength={50} autoComplete="username" placeholder="e.g. juan.delacruz" /><span className="mt-1.5 block text-xs font-normal text-slate-500">At least 3 characters. This will be used to sign in.</span></label>
            <label className={labelClass}>System role <span className="text-red-600">*</span><select className={inputClass} name="role" required defaultValue="" disabled={Boolean(rolesError) || roles.length === 0}><option value="" disabled>{rolesError ? "Roles unavailable" : roles.length === 0 ? "Loading roles..." : "Select a role"}</option>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select><span className="mt-1.5 block text-xs font-normal text-slate-500">Roles are loaded from the active records in the database.</span>{rolesError && <span className="mt-1 block text-xs font-normal text-red-600">{rolesError}</span>}</label>
            <label className={labelClass}>First name <span className="text-red-600">*</span><input className={inputClass} name="firstName" required maxLength={50} autoComplete="given-name" /></label>
            <label className={labelClass}>Middle name <span className="font-normal text-slate-400">(optional)</span><input className={inputClass} name="middleName" maxLength={50} autoComplete="additional-name" /></label>
            <label className={labelClass}>Last name <span className="text-red-600">*</span><input className={inputClass} name="lastName" required maxLength={50} autoComplete="family-name" /></label>
            <label className={labelClass}>Email address <span className="text-red-600">*</span><input className={inputClass} name="email" type="email" required maxLength={150} autoComplete="email" placeholder="name@example.com" /></label>
          </div>
        </section>

        <section aria-labelledby="access-heading" className="border-t border-slate-200 pt-7">
          <div className="mb-5"><h3 id="access-heading" className="text-sm font-bold text-slate-900">Account access</h3><p className="mt-1 text-sm text-slate-500">Create secure sign-in credentials for this account.</p></div>
          <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
            <label className={labelClass}>Password <span className="text-red-600">*</span><span className="relative mt-2 block"><input className={`${inputClass} mt-0 pr-11`} name="password" type={showPassword ? "text" : "password"} required minLength={8} autoComplete="new-password" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 transition hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}><EyeIcon /></button></span><span className="mt-1.5 block text-xs font-normal text-slate-500">Use 8 or more characters.</span></label>
            <label className={labelClass}>Confirm password <span className="text-red-600">*</span><span className="relative mt-2 block"><input className={`${inputClass} mt-0 pr-11`} name="confirmPassword" type={showConfirmPassword ? "text" : "password"} required minLength={8} autoComplete="new-password" /><button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 transition hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} aria-pressed={showConfirmPassword}><EyeIcon /></button></span></label>
          </div>
        </section>

        {status && <div role="alert" className={`flex gap-3 rounded-lg border px-4 py-3 text-sm ${status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}><span className="mt-0.5 font-bold" aria-hidden="true">{status.type === "success" ? "OK" : "!"}</span><p>{status.message}</p></div>}
      </div>

      <div className="flex flex-col-reverse gap-4 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8"><p className="flex items-center gap-2 text-xs leading-5 text-slate-500"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 shrink-0" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path strokeLinecap="round" d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>Account details are securely stored.</p><button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60">{submitting && <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}{submitting ? "Creating user..." : "Create user"}</button></div>
    </form>
  );
}
