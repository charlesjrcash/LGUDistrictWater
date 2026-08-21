import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { AdjustmentForm } from "@/app/transactions/bill-adjustments/ui";
import { Modal } from "@/modules/shared/ui/modal";

export default async function Page({
  params,
}: {
  params: Promise<{ adjustmentId: string }>;
}) {
  const { adjustmentId } = await params;
  if (!(await hasPermission("BILL_EDIT"))) redirect("/");
  return (
    <Modal wide>
      <AdjustmentForm adjustmentId={adjustmentId} variant="modal" />
    </Modal>
  );
}
