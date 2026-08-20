import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { AdjustmentForm } from "../../ui";
export default async function Page({ params }: { params: Promise<{ adjustmentId: string }> }) { const { adjustmentId } = await params; if (!(await hasPermission("BILL_EDIT"))) redirect("/"); return <AdjustmentForm adjustmentId={adjustmentId} />; }
