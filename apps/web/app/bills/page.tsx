import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { BillsPage } from "@/modules/bills/ui";
export default async function Page() { if (!(await hasPermission("BILL_VIEW"))) redirect("/"); return <BillsPage canCreate={await hasPermission("BILL_CREATE")} canEdit={await hasPermission("BILL_EDIT")} />; }
