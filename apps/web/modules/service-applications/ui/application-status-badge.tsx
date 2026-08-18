import { classifyStatus } from "@/modules/service-applications/server";
import styles from "./service-applications.module.css";

export function ApplicationStatusBadge({ code, name }: { code: string; name: string }) {
  const kind = classifyStatus(code, name);
  return <span className={`${styles.badge} ${styles[kind]}`}>{name}</span>;
}
