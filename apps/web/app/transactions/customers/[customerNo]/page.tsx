import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { CustomerDetails } from "@/modules/customers/ui/customer-details";

export default async function Page({
  params,
}: {
  params: Promise<{ customerNo: string }>;
}) {
  const { customerNo } = await params;
  if (!(await hasPermission("CUSTOMER_VIEW"))) redirect("/");
  return <CustomerDetails customerNo={decodeURIComponent(customerNo)} />;
}
