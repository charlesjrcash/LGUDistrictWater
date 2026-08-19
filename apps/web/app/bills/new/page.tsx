import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { BillForm } from "@/modules/bills/ui";
export default async function Page() { if (!(await hasPermission("BILL_CREATE"))) redirect("/"); return <BillForm />; }
