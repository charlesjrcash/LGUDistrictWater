import type { ReactNode } from "react";
import styles from "@/modules/transactions/ui/transactions.module.css";

export function TransactionShell({
  children,
}: {
  children: ReactNode;
  active?:
    | "dashboard"
    | "customers"
    | "service-applications"
    | "service-accounts"
    | "meters"
    | "meter-installations"
    | "disconnection-orders"
    | "service-installations"
    | "meter-readings";
}) {
  return (
    <div className={styles.page}>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
