import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { ReconnectionOrdersPage } from "@/modules/reconnection-orders/ui";

export default async function Page() {
  if (!(await hasPermission("METER_INSTALLATION_VIEW"))) redirect("/");
  const [canCreate, canEdit] = await Promise.all([
    hasPermission("METER_INSTALLATION_CREATE"),
    hasPermission("METER_INSTALLATION_EDIT"),
  ]);
  return <ReconnectionOrdersPage canCreate={canCreate} canEdit={canEdit} />;
}
