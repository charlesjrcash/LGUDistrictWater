import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-session";
import { CustomerForm } from "@/modules/customers/ui/customer-form";

export default async function Page({params}:{params:Promise<{customerNo:string}>}){const{customerNo}=await params;if(!await getSessionUser())redirect(`/login?next=/customers/${encodeURIComponent(customerNo)}/edit`);return <CustomerForm customerNo={decodeURIComponent(customerNo)}/>;}
