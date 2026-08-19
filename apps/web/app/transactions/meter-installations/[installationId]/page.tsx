import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { InstallationDetail } from "@/modules/meter-installations/ui";

export default async function Page({
  params,
}: PageProps<"/transactions/meter-installations/[installationId]">) {
  const { installationId } = await params;
  if (!(await hasPermission("METER_INSTALLATION_VIEW"))) redirect("/");
  return (
    <InstallationDetail
      installationId={decodeURIComponent(installationId)}
      canEdit={await hasPermission("METER_INSTALLATION_EDIT")}
    />
  );
}
