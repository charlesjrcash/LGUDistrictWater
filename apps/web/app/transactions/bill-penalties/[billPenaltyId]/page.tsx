import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { BillPenaltyRecord } from "../ui";
export default async function Page({ params }: PageProps<"/transactions/bill-penalties/[billPenaltyId]">) { const { billPenaltyId } = await params; if (!(await hasPermission("BILL_VIEW"))) redirect("/"); return <BillPenaltyRecord billPenaltyId={billPenaltyId} />; }
