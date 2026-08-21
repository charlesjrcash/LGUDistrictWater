import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { EditAccountForm } from "@/modules/service-accounts/ui/edit-account-form";
import { Modal } from "@/modules/shared/ui/modal";

export default async function Page({
  params,
}: {
  params: Promise<{ controlNo: string }>;
}) {
  const { controlNo } = await params;
  if (!(await hasPermission("SERVICE_ACCOUNT_EDIT"))) redirect("/");
  return (
    <Modal wide>
      <EditAccountForm
        controlNo={decodeURIComponent(controlNo)}
        variant="modal"
      />
    </Modal>
  );
}
