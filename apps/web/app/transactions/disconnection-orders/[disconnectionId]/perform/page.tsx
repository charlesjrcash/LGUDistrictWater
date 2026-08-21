import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { PerformDisconnectionForm } from "@/modules/disconnection-orders/ui";

export default async function Page({ params }: PageProps<"/transactions/disconnection-orders/[disconnectionId]/perform">) {
  const { disconnectionId } = await params;
  if (!(await hasPermission("METER_INSTALLATION_EDIT"))) redirect("/");
  return <PerformDisconnectionForm disconnectionId={decodeURIComponent(disconnectionId)} />;
}
