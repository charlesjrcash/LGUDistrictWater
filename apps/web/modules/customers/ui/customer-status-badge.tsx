import styles from "@/modules/transactions/ui/transactions.module.css";

export function CustomerStatusBadge({ status }: { status: string }) {
  const active = status.toUpperCase() === "ACTIVE";
  return (
    <span
      className={`${styles.badge} ${active ? styles.approved : styles.neutral}`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
