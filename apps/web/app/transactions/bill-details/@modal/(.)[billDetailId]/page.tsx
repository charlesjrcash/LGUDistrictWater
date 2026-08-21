import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { Modal } from "@/modules/shared/ui/modal";
import { BillDetailRecord } from "../../ui";

export default async function Page({
  params,
}: {
  params: Promise<{ billDetailId: string }>;
}) {
  const { billDetailId } = await params;
  if (!(await hasPermission("BILL_VIEW"))) redirect("/");
  return (
    <Modal wide>
      <BillDetailRecord billDetailId={billDetailId} variant="modal" />
    </Modal>
  );
}
