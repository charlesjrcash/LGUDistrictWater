// import { redirect } from "next/navigation";
// import { getSessionUser } from "@/lib/server-session";
// import { hasPermission } from "@/lib/permissions";
import { CustomerForm } from "@/modules/customers/ui/customer-form";

export default async function Page({searchParams}:{searchParams:Promise<{returnTo?:string}>}){
  // if(!await getSessionUser())redirect("/login?next=/transactions/customers/new");
  // if(!await hasPermission("CUSTOMER_CREATE"))redirect("/");
  const{returnTo}=await searchParams;
  return <CustomerForm returnTo={returnTo}/>;
}
