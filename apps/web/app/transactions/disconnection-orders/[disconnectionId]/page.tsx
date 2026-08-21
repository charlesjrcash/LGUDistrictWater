import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { DisconnectionOrderDetail } from "@/modules/disconnection-orders/ui";

export default async function Page({ params }: PageProps<"/transactions/disconnection-orders/[disconnectionId]">) {
  const { disconnectionId } = await params;
  if (!(await hasPermission("METER_INSTALLATION_VIEW"))) redirect("/");
  return <DisconnectionOrderDetail disconnectionId={decodeURIComponent(disconnectionId)} canEdit={await hasPermission("METER_INSTALLATION_EDIT")} />;
}
