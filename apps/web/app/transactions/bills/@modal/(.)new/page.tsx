import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { BillForm } from "@/modules/bills/ui";
import { Modal } from "@/modules/shared/ui/modal";

export default async function Page() {
  if (!(await hasPermission("BILL_CREATE"))) redirect("/");
  return (
    <Modal wide>
      <BillForm variant="modal" />
    </Modal>
  );
}
