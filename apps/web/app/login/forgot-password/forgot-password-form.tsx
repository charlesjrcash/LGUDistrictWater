"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const inputClass =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [status, setStatus] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch(
        codeSent
          ? "/api/auth/forgot-password/verify"
          : "/api/auth/forgot-password/request",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            codeSent ? { email, code: form.get("code") } : { email },
          ),
        },
      );
      const result = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(result.message || "Unable to continue.");
      if (codeSent) {
        router.push("/login/change-password?recovery=1");
        router.refresh();
        return;
      }
      setCodeSent(true);
      setStatus({
        type: "success",
        message:
          result.message || "Check your email for the verification code.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to continue.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
      <p className="mt-2 text-sm text-slate-600">
        {codeSent
          ? `Enter the six-digit code sent to ${email}.`
          : "Enter the email address registered to your user or employee account."}
      </p>
      <div className="mt-6">
        <label className="block text-sm font-semibold text-slate-800">
          Email address
          <input
            className={inputClass}
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            disabled={codeSent}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        {codeSent && (
          <label className="mt-5 block text-sm font-semibold text-slate-800">
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
        )}
      </div>
      {status && (
        <p
          role="alert"
          className={`mt-5 rounded-lg border px-4 py-3 text-sm ${status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
        >
          {status.message}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? "Please wait..."
          : codeSent
            ? "Verify code"
            : "Send verification code"}
      </button>
      {codeSent && (
        <button
          type="button"
          className="mt-3 w-full text-sm font-semibold text-blue-700 hover:text-blue-800"
          onClick={() => {
            setCodeSent(false);
            setStatus(null);
          }}
        >
          Use a different email
        </button>
      )}
      <Link
        href="/login"
        className="mt-4 block text-center text-sm font-semibold text-blue-700 hover:text-blue-800"
      >
        ← Back to login
      </Link>
    </form>
  );
}
