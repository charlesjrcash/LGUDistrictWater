import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { AdjustmentDetail } from "@/app/transactions/bill-adjustments/ui";
import { Modal } from "@/modules/shared/ui/modal";

export default async function Page({
  params,
}: {
  params: Promise<{ adjustmentId: string }>;
}) {
  const { adjustmentId } = await params;
  if (!(await hasPermission("BILL_VIEW"))) redirect("/");
  return (
    <Modal wide>
      <AdjustmentDetail
        adjustmentId={adjustmentId}
        canEdit={await hasPermission("BILL_EDIT")}
        variant="modal"
      />
    </Modal>
  );
}
