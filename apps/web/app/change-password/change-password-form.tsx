"use client";

import { FormEvent, useState } from "react";

const inputClass = "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

/** Replaces an authenticated user's temporary password before system access continues. */
export default function ChangePasswordForm() {
  const [status, setStatus] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const form = event.currentTarget;

  setStatus(null);
  setSubmitting(true);

  try {
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });

    const result = (await response.json()) as { message?: string };

    if (!response.ok) {
      throw new Error(result.message || "Unable to update password.");
    }

    setStatus({
      type: "success",
      message: result.message || "Password updated.",
    });

    form.reset();
  } catch (error) {
    setStatus({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to update password.",
    });
  } finally {
    setSubmitting(false);
  }
}

  return <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><h1 className="text-2xl font-bold text-slate-900">Create a new password</h1><p className="mt-2 text-sm text-slate-600">Your temporary password was accepted. Choose a new password to activate your account.</p><div className="mt-6 space-y-5"><label className="block text-sm font-semibold text-slate-800">New password<input className={inputClass} name="password" type="password" required minLength={8} autoComplete="new-password" /></label><label className="block text-sm font-semibold text-slate-800">Confirm new password<input className={inputClass} name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" /></label></div>{status && <p role="alert" className={`mt-5 rounded-lg border px-4 py-3 text-sm ${status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{status.message}</p>}<button type="submit" disabled={submitting} className="mt-6 w-full rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Updating password..." : "Update password"}</button></form>;
}
