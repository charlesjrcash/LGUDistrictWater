import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { DisconnectionOrderForm } from "@/modules/disconnection-orders/ui";

export default async function Page() {
  if (!(await hasPermission("METER_INSTALLATION_CREATE"))) redirect("/");
  return <DisconnectionOrderForm />;
}
