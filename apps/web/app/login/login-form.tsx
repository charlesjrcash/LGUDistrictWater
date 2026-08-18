"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

function FieldIcon({ type }: { type: "user" | "lock" }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{type === "user" ? <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></> : <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>}</svg>;
}

export default function LoginForm({ initialError, nextPath = "/" }: { initialError?: string; nextPath?: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ type: "error" | "success"; message: string } | null>(initialError ? { type: "error", message: initialError } : null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus(null); setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
      const result = (await response.json()) as { message?: string; mustChangePassword?: boolean };
      if (!response.ok) throw new Error(result.message || "Unable to sign in.");
      if (result.mustChangePassword) router.push("/change-password"); else { setStatus({ type: "success", message: result.message || "Signed in successfully." }); router.push(nextPath); router.refresh(); }
    } catch (error) { setStatus({ type: "error", message: error instanceof Error ? error.message : "Unable to sign in." }); }
    finally { setSubmitting(false); }
  }

  return <form onSubmit={handleSubmit} className={styles.form}>
    <div className={styles.formHeading}><span>WELCOME BACK</span><h1>Sign in to your account</h1><p>Use your registered Google account or temporary credentials.</p></div>
    <a className={styles.googleButton} href="/api/auth/google/start"><svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.42l-3.24-2.53c-.9.6-2.05.96-3.39.96-2.6 0-4.81-1.76-5.6-4.13H3.06v2.61A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.88A6 6 0 0 1 6.08 12c0-.65.11-1.29.32-1.88V7.51H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.49l3.34-2.61Z"/><path fill="#EA4335" d="M12 5.99c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.94 5.51l3.34 2.61C7.19 7.75 9.4 5.99 12 5.99Z"/></svg>Continue with Google</a>
    <div className={styles.divider}><span>or continue with credentials</span></div>
    <div className={styles.fields}><label>Username<div className={styles.inputWrap}><FieldIcon type="user"/><input name="username" required autoComplete="username" placeholder="Enter your username" /></div></label><label>Password<div className={styles.inputWrap}><FieldIcon type="lock"/><input name="password" type="password" required autoComplete="current-password" placeholder="Enter your password" /></div></label></div>
    {status && <p role="alert" className={`${styles.status} ${status.type === "success" ? styles.success : styles.error}`}>{status.message}</p>}
    <button type="submit" disabled={submitting}>{submitting ? <><i className={styles.spinner}/> Signing in...</> : <>Sign in <span>→</span></>}</button>
    <p className={styles.security}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>Secure access for authorized personnel only</p>
  </form>;
}
