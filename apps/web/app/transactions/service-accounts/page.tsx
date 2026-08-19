import { ServiceAccountsPage } from "@/modules/service-accounts/ui/service-accounts-page";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";

<<<<<<< HEAD:apps/web/app/service-accounts/page.tsx
export default async function Page() { if (!await hasPermission("SERVICE_ACCOUNT_VIEW")) redirect("/"); return <ServiceAccountsPage />; }
=======
export default function Page() {
  return <ServiceAccountsPage />;
}
>>>>>>> 5e852f8f672f3ffc47731a0574417c82b0b41e8a:apps/web/app/transactions/service-accounts/page.tsx
