import { ServiceApplicationsPage } from "@/modules/service-applications/ui/service-applications-page";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-session";
import { hasPermission } from "@/lib/permissions";

export default async function Page() {
  if (!await getSessionUser()) redirect("/login?next=/transactions/service-applications");
  if (!await hasPermission("SERVICE_APPLICATION_VIEW")) redirect("/");
  return <ServiceApplicationsPage />;
}
