import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-session";
import { CustomerForm } from "@/modules/customers/ui/customer-form";

export default async function Page({searchParams}:{searchParams:Promise<{returnTo?:string}>}){if(!await getSessionUser())redirect("/login?next=/customers/new");const{returnTo}=await searchParams;return <CustomerForm returnTo={returnTo}/>;}
