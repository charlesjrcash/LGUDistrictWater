"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

function FieldIcon({ type }: { type: "user" | "lock" }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{type === "user" ? <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></> : <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>}</svg>;
}

export default function LoginForm() {
  const router = useRouter();
  const [status, setStatus] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus(null); setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
      const result = (await response.json()) as { message?: string; mustChangePassword?: boolean };
      if (!response.ok) throw new Error(result.message || "Unable to sign in.");
      if (result.mustChangePassword) router.push("/change-password"); else setStatus({ type: "success", message: result.message || "Signed in successfully." });
    } catch (error) { setStatus({ type: "error", message: error instanceof Error ? error.message : "Unable to sign in." }); }
    finally { setSubmitting(false); }
  }
  return <form onSubmit={handleSubmit} className={styles.form}><div className={styles.formHeading}><span>WELCOME BACK</span><h1>Sign in to your account</h1><p>Enter the temporary credentials sent to your registered email.</p></div><div className={styles.fields}><label>Username<div className={styles.inputWrap}><FieldIcon type="user"/><input name="username" required autoComplete="username" placeholder="Enter your username" /></div></label><label>Password<div className={styles.inputWrap}><FieldIcon type="lock"/><input name="password" type="password" required autoComplete="current-password" placeholder="Enter your password" /></div></label></div>{status && <p role="alert" className={`${styles.status} ${status.type === "success" ? styles.success : styles.error}`}>{status.message}</p>}<button type="submit" disabled={submitting}>{submitting ? <><i className={styles.spinner}/> Signing in...</> : <>Sign in <span>→</span></>}</button><p className={styles.security}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>Secure access for authorized personnel only</p></form>;
}
