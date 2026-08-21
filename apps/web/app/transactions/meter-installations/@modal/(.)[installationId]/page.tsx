import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { InstallationDetail } from "@/modules/meter-installations/ui";
import { Modal } from "@/modules/shared/ui/modal";

export default async function Page({
  params,
}: {
  params: Promise<{ installationId: string }>;
}) {
  const { installationId } = await params;
  if (!(await hasPermission("METER_INSTALLATION_VIEW"))) redirect("/");
  return (
    <Modal wide>
      <InstallationDetail
        installationId={decodeURIComponent(installationId)}
        canEdit={await hasPermission("METER_INSTALLATION_EDIT")}
        variant="modal"
      />
    </Modal>
  );
}
