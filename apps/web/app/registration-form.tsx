"use client";

import { FormEvent, useState } from "react";

const roles = ["Administrator", "Billing Office", "Cashier", "Collection Officer", "Accounting Officer", "Report User", "Viewer"];
const inputClass = "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export default function RegistrationForm() {
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setSubmitting(true);
    const form = event.currentTarget;
    try {
      const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Unable to create user.");
      form.reset();
      setStatus({ type: "success", message: result.message || "User created successfully." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Unable to create user." });
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Username<input className={inputClass} name="username" required minLength={3} maxLength={50} autoComplete="username" placeholder="e.g. juan.delacruz" /></label>
        <label className="text-sm font-medium text-slate-700">First name<input className={inputClass} name="firstName" required maxLength={50} autoComplete="given-name" /></label>
        <label className="text-sm font-medium text-slate-700">Middle name <span className="font-normal text-slate-400">(optional)</span><input className={inputClass} name="middleName" maxLength={50} autoComplete="additional-name" /></label>
        <label className="text-sm font-medium text-slate-700">Last name<input className={inputClass} name="lastName" required maxLength={50} autoComplete="family-name" /></label>
        <label className="text-sm font-medium text-slate-700">Email address<input className={inputClass} name="email" type="email" required maxLength={150} autoComplete="email" placeholder="name@example.com" /></label>
        <label className="text-sm font-medium text-slate-700">Password<input className={inputClass} name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
        <label className="text-sm font-medium text-slate-700">Confirm password<input className={inputClass} name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" /></label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Role<select className={inputClass} name="role" required defaultValue=""><option value="" disabled>Select a role</option>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
      </div>
      {status && <div role="alert" className={`mt-6 rounded-lg px-4 py-3 text-sm ${status.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{status.message}</div>}
      <div className="mt-7 flex justify-end"><button type="submit" disabled={submitting} className="rounded-lg bg-blue-700 px-6 py-2.5 font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Creating user…" : "Create User"}</button></div>
    </form>
  );
}
