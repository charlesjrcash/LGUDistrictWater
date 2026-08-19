// import { redirect } from "next/navigation";
// import { getSessionUser } from "@/lib/server-session";
// import { hasPermission } from "@/lib/permissions";
import { CustomersPage } from "@/modules/customers/ui/customers-page";

export default async function Page() {
  // if(!await getSessionUser())redirect("/login?next=/transactions/customers");
  // if(!await hasPermission("CUSTOMER_VIEW"))redirect("/");
  return <CustomersPage />;
}
