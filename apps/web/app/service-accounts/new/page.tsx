import Link from "next/link";
import { CreateAccountForm } from "@/modules/service-accounts/ui/create-account-form";
import { ModuleShell } from "@/modules/service-applications/ui/module-shell";
import styles from "@/modules/service-applications/ui/service-applications.module.css";

export default async function Page({ searchParams }: { searchParams: Promise<{ application?: string }> }) {
  const applicationNo = (await searchParams).application?.trim();
  if (!applicationNo) return <ModuleShell active="service-accounts"><div className={`${styles.panel} ${styles.empty}`}><h2>Approved application required</h2><p>Create service accounts from an approved Service Application so customer and application information remain linked.</p><Link href="/service-applications" className={styles.button}>View Service Applications</Link></div></ModuleShell>;
  return <CreateAccountForm applicationNo={applicationNo} />;
}
