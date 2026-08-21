import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { Modal } from "@/modules/shared/ui/modal";
import { BillPenaltyRecord } from "../../ui";

export default async function Page({
  params,
}: {
  params: Promise<{ billPenaltyId: string }>;
}) {
  const { billPenaltyId } = await params;
  if (!(await hasPermission("BILL_VIEW"))) redirect("/");
  return (
    <Modal wide>
      <BillPenaltyRecord billPenaltyId={billPenaltyId} variant="modal" />
    </Modal>
  );
}
