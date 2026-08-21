import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { DisconnectionOrderForm } from "@/modules/disconnection-orders/ui";

export default async function Page({ params }: PageProps<"/transactions/disconnection-orders/[disconnectionId]/edit">) {
  const { disconnectionId } = await params;
  if (!(await hasPermission("METER_INSTALLATION_EDIT"))) redirect("/");
  return <DisconnectionOrderForm disconnectionId={decodeURIComponent(disconnectionId)} />;
}
