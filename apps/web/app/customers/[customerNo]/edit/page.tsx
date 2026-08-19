import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-session";
import { hasPermission } from "@/lib/permissions";
import { CustomerForm } from "@/modules/customers/ui/customer-form";

export default async function Page({params}:{params:Promise<{customerNo:string}>}){const{customerNo}=await params;if(!await getSessionUser())redirect(`/login?next=/customers/${encodeURIComponent(customerNo)}/edit`);if(!await hasPermission("CUSTOMER_EDIT"))redirect("/");return <CustomerForm customerNo={decodeURIComponent(customerNo)}/>;}
