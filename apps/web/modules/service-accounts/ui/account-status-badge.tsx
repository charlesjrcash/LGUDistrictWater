import { classifyAccountStatus } from "@/modules/service-accounts/server";
import styles from "@/modules/transactions/ui/transactions.module.css";

export function AccountStatusBadge({
  code,
  name,
}: {
  code: string;
  name: string;
}) {
  const kind = classifyAccountStatus(code, name);
  return <span className={`${styles.badge} ${styles[kind]}`}>{name}</span>;
}
