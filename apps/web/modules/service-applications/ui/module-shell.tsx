import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./service-applications.module.css";

function WaterMark() {
  return (
    <svg className={styles.brandMark} viewBox="0 0 40 48" fill="none" aria-hidden="true">
      <path d="M20 2C15 12 6 21 6 31.3A14 14 0 0 0 34 31.3C34 21 25 12 20 2Z" fill="currentColor" />
      <path d="M12 31c1 6 5 9 10 9 4 0 7-2 9-5-8 4-15 1-19-4Z" fill="white" opacity=".9" />
    </svg>
  );
}

export function ModuleShell({ children, active = "service-applications" }: { children: ReactNode; active?: "service-applications" | "service-accounts" }) {
  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link href="/" className={styles.brand}>
            <WaterMark />
            <span>Bagamanoc<span className={styles.brandSmall}>WATER BILLING SYSTEM</span></span>
          </Link>
          <nav className={styles.nav} aria-label="Administration">
            <Link href="/customers">Customers</Link>
            <Link href="/service-applications" className={active === "service-applications" ? styles.active : undefined}>Service Applications</Link>
            <Link href="/service-accounts" className={active === "service-accounts" ? styles.active : undefined}>Service Accounts</Link>
            <Link href="/maintenance/water-rates">Water Rates</Link>
          </nav>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
