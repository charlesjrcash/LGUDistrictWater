import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { CustomerForm } from "@/modules/customers/ui/customer-form";
import { Modal } from "@/modules/shared/ui/modal";

export default async function Page() {
  if (!(await hasPermission("CUSTOMER_CREATE"))) redirect("/");
  return (
    <Modal wide>
      <CustomerForm variant="modal" />
    </Modal>
  );
}
