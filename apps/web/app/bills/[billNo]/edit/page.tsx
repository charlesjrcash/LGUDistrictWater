import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { BillForm } from "@/modules/bills/ui";
export default async function Page({ params }: PageProps<"/bills/[billNo]/edit">) { const { billNo } = await params; if (!(await hasPermission("BILL_EDIT"))) redirect("/"); return <BillForm billNo={decodeURIComponent(billNo)} />; }
