import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { CustomersPage } from "@/modules/customers/ui/customers-page";

export default async function Page() {
  if (!(await hasPermission("CUSTOMER_VIEW"))) redirect("/");
  return <CustomersPage />;
}
