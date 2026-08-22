"use client";

import { FormEvent, useEffect, useState } from "react";

const inputClass =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
const primaryButtonClass =
  "rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClass =
  "rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

type Status = { type: "error" | "success"; message: string } | null;

function StatusMessage({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p
      role="alert"
      className={`mt-4 rounded-lg border px-4 py-3 text-sm ${status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
    >
      {status.message}
    </p>
  );
}

export function MfaSettingsForm({
  email,
  mfaEnabled,
}: {
  email: string | null;
  mfaEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(mfaEnabled);
  const [enrolling, setEnrolling] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  async function startEnroll() {
    setSubmitting(true);
    setStatus(null);
    try {
      const response = await fetch("/api/account/mfa/enroll/request", {
        method: "POST",
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(result.message || "Unable to send a verification code.");
      setEnrolling(true);
      setResendCooldown(60);
      setStatus({
        type: "success",
        message: result.message || "Check your email for the verification code.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to send a verification code.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmEnroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/account/mfa/enroll/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: form.get("code") }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Unable to verify code.");
      setEnabled(true);
      setEnrolling(false);
      setStatus({
        type: "success",
        message: result.message || "Two-factor sign-in is now enabled.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to verify code.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDisable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/account/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: form.get("password") }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Unable to disable.");
      setEnabled(false);
      setDisabling(false);
      setStatus({
        type: "success",
        message: result.message || "Two-factor sign-in is now disabled.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to disable.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Email verification code at sign-in
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {enabled
              ? `Enabled. We'll email a code to ${email ?? "your registered address"} whenever you sign in with your password.`
              : "Add a second step to your password sign-in by emailing a one-time code."}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
        >
          {enabled ? "ON" : "OFF"}
        </span>
      </div>

      {!enabled && !enrolling && (
        <button
          type="button"
          className={`${primaryButtonClass} mt-5`}
          disabled={submitting || !email}
          onClick={() => void startEnroll()}
        >
          {submitting ? "Please wait..." : "Enable two-factor sign-in"}
        </button>
      )}
      {!enabled && !email && (
        <p className="mt-2 text-xs text-slate-500">
          Add an email address to your account first.
        </p>
      )}

      {enrolling && (
        <form onSubmit={confirmEnroll} className="mt-5">
          <label className="block text-sm font-semibold text-slate-800">
            Verification code
            <input
              className={`${inputClass} text-center text-xl tracking-[0.35em]`}
              name="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoComplete="one-time-code"
              autoFocus
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" className={primaryButtonClass} disabled={submitting}>
              {submitting ? "Verifying..." : "Confirm"}
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={submitting}
              onClick={() => {
                setEnrolling(false);
                setStatus(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="text-sm font-semibold text-blue-700 hover:text-blue-800 disabled:cursor-not-allowed disabled:text-slate-400"
              disabled={submitting || resendCooldown > 0}
              onClick={() => void startEnroll()}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}

      {enabled && !disabling && (
        <button
          type="button"
          className={`${secondaryButtonClass} mt-5`}
          disabled={submitting}
          onClick={() => {
            setDisabling(true);
            setStatus(null);
          }}
        >
          Disable two-factor sign-in
        </button>
      )}

      {disabling && (
        <form onSubmit={confirmDisable} className="mt-5">
          <label className="block text-sm font-semibold text-slate-800">
            Confirm your current password
            <input
              className={inputClass}
              name="password"
              type="password"
              required
              autoComplete="current-password"
              autoFocus
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" className={primaryButtonClass} disabled={submitting}>
              {submitting ? "Disabling..." : "Disable"}
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={submitting}
              onClick={() => {
                setDisabling(false);
                setStatus(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <StatusMessage status={status} />
    </div>
  );
}
