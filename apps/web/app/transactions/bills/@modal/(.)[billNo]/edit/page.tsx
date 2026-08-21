import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { BillForm } from "@/modules/bills/ui";
import { Modal } from "@/modules/shared/ui/modal";

export default async function Page({
  params,
}: {
  params: Promise<{ billNo: string }>;
}) {
  const { billNo } = await params;
  if (!(await hasPermission("BILL_EDIT"))) redirect("/");
  return (
    <Modal wide>
      <BillForm billNo={decodeURIComponent(billNo)} variant="modal" />
    </Modal>
  );
}
