import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { DisconnectionOrdersPage } from "@/modules/disconnection-orders/ui";

export default async function Page() {
  if (!(await hasPermission("METER_INSTALLATION_VIEW"))) redirect("/");
  const [canCreate, canEdit] = await Promise.all([hasPermission("METER_INSTALLATION_CREATE"), hasPermission("METER_INSTALLATION_EDIT")]);
  return <DisconnectionOrdersPage canCreate={canCreate} canEdit={canEdit} />;
}
