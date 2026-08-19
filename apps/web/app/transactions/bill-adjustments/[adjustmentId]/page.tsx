import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { AdjustmentDetail } from "../ui";
export default async function Page({ params }: PageProps<"/transactions/bill-adjustments/[adjustmentId]">) { const { adjustmentId } = await params; if (!(await hasPermission("BILL_VIEW"))) redirect("/"); return <AdjustmentDetail adjustmentId={adjustmentId} canEdit={await hasPermission("BILL_EDIT")} />; }
