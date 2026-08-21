import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { BillDetail } from "@/modules/bills/ui";
import { Modal } from "@/modules/shared/ui/modal";

export default async function Page({
  params,
}: {
  params: Promise<{ billNo: string }>;
}) {
  const { billNo } = await params;
  if (!(await hasPermission("BILL_VIEW"))) redirect("/");
  return (
    <Modal wide>
      <BillDetail
        billNo={decodeURIComponent(billNo)}
        canEdit={await hasPermission("BILL_EDIT")}
        variant="modal"
      />
    </Modal>
  );
}
