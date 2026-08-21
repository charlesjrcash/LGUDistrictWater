import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { CustomerDetails } from "@/modules/customers/ui/customer-details";
import { Modal } from "@/modules/shared/ui/modal";

export default async function Page({
  params,
}: {
  params: Promise<{ customerNo: string }>;
}) {
  const { customerNo } = await params;
  if (!(await hasPermission("CUSTOMER_VIEW"))) redirect("/");
  return (
    <Modal wide>
      <CustomerDetails customerNo={decodeURIComponent(customerNo)} variant="modal" />
    </Modal>
  );
}
