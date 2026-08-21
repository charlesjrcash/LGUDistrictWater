import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { AccountDetails } from "@/modules/service-accounts/ui/account-details";
import { Modal } from "@/modules/shared/ui/modal";

export default async function Page({
  params,
}: {
  params: Promise<{ controlNo: string }>;
}) {
  const { controlNo } = await params;
  if (!(await hasPermission("SERVICE_ACCOUNT_VIEW"))) redirect("/");
  return (
    <Modal wide>
      <AccountDetails
        controlNo={decodeURIComponent(controlNo)}
        canEdit={await hasPermission("SERVICE_ACCOUNT_EDIT")}
        variant="modal"
      />
    </Modal>
  );
}
