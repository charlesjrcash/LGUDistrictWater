import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { InstallationForm } from "@/modules/meter-installations/ui";

export default async function Page({
  params,
}: PageProps<"/transactions/meter-installations/[installationId]/edit">) {
  const { installationId } = await params;
  if (!(await hasPermission("METER_INSTALLATION_EDIT"))) redirect("/");
  return (
    <InstallationForm installationId={decodeURIComponent(installationId)} />
  );
}
