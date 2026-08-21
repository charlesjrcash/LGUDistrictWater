import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { CustomerForm } from "@/modules/customers/ui/customer-form";
import { Modal } from "@/modules/shared/ui/modal";

export default async function Page({
  params,
}: {
  params: Promise<{ customerNo: string }>;
}) {
  const { customerNo } = await params;
  if (!(await hasPermission("CUSTOMER_EDIT"))) redirect("/");
  return (
    <Modal wide>
      <CustomerForm customerNo={decodeURIComponent(customerNo)} variant="modal" />
    </Modal>
  );
}
