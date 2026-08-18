import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-session";
import { CustomersPage } from "@/modules/customers/ui/customers-page";

export default async function Page(){if(!await getSessionUser())redirect("/login?next=/customers");return <CustomersPage/>;}
