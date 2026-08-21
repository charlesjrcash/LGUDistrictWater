import type { ReactNode } from "react";
import styles from "@/modules/transactions/ui/transactions.module.css";

export function TransactionShell({
  children,
  variant = "page",
}: {
  children: ReactNode;
  variant?: "page" | "modal";
  active?:
    | "dashboard"
    | "customers"
    | "service-applications"
    | "service-accounts"
    | "meters"
    | "meter-installations"
    | "service-installations"
    | "meter-readings";
}) {
  if (variant === "modal") return <>{children}</>;
  return (
    <div className={styles.page}>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
