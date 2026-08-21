import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { ServiceInstallationsPage } from "@/modules/service-installations/ui";

export default async function Page() {
  if (!(await hasPermission("METER_INSTALLATION_VIEW"))) redirect("/");
  const [canCreate, canEdit] = await Promise.all([hasPermission("METER_INSTALLATION_CREATE"), hasPermission("METER_INSTALLATION_EDIT")]);
  return <ServiceInstallationsPage canCreate={canCreate} canEdit={canEdit} />;
}
