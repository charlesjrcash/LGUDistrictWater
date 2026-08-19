import { ServiceAccountsPage } from "@/modules/service-accounts/ui/service-accounts-page";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";

export default async function Page() {
  if (!(await hasPermission("SERVICE_ACCOUNT_VIEW"))) redirect("/");
  return <ServiceAccountsPage />;
}
