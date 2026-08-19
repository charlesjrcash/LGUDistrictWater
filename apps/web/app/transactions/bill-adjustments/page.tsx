import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { BillAdjustmentsPage } from "./ui";
export default async function Page() { if (!(await hasPermission("BILL_VIEW"))) redirect("/"); return <BillAdjustmentsPage canCreate={await hasPermission("BILL_CREATE")} />; }
