import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { ConnectionFeesPage } from "@/modules/connection-fees/ui";
export default async function Page(){if(!(await hasPermission("BILL_VIEW")))redirect("/");return <ConnectionFeesPage canCreate={await hasPermission("BILL_CREATE")} canEdit={await hasPermission("BILL_EDIT")}/>}
