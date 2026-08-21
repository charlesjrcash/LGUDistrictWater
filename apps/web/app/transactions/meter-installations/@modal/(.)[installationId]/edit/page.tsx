import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { InstallationForm } from "@/modules/meter-installations/ui";
import { Modal } from "@/modules/shared/ui/modal";

export default async function Page({
  params,
}: {
  params: Promise<{ installationId: string }>;
}) {
  const { installationId } = await params;
  if (!(await hasPermission("METER_INSTALLATION_EDIT"))) redirect("/");
  return (
    <Modal wide>
      <InstallationForm
        installationId={decodeURIComponent(installationId)}
        variant="modal"
      />
    </Modal>
  );
}
