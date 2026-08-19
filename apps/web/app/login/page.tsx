import type { Metadata } from "next";
import LoginForm from "./login-form";
import { SiteHeader } from "@/modules/navigation";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "Sign in", description: "Sign in to the Bagamanoc Water Billing System." };

function WaterLogo() {
  return <span className={styles.brand}><svg aria-hidden="true" viewBox="0 0 44 54"><path d="M22 2C17 12 7 23 7 34a15 15 0 0 0 30 0C37 23 27 12 22 2Z" fill="currentColor"/><path d="M13 31c2 8 11 11 18 5-1 7-6 11-11 11-7 0-11-6-10-13 .5-2 1-3 3-3Z" fill="white" opacity=".9"/><path d="M20 13c-1 5-5 9-7 13" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg><span><strong>Bagamanoc</strong><small>SMARTER PUBLIC SERVICE</small></span></span>;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; passwordChanged?: string }> }) {
  const { error, next, passwordChanged } = await searchParams;
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  const initialSuccess = passwordChanged === "1" ? "Password changed successfully! Sign in with your new password." : undefined;
  return <><SiteHeader /><main className={styles.page}><section className={styles.intro}><div className={styles.introContent}><WaterLogo /></div><div className={styles.waveOne}/><div className={styles.waveTwo}/><div className={styles.waveThree}/></section><section className={styles.formPanel}><LoginForm initialError={error} initialSuccess={initialSuccess} nextPath={nextPath} /></section></main></>;
}
