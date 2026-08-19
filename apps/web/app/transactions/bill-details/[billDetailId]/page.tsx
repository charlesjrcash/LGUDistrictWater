import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { BillDetailRecord } from "../ui";

export default async function Page({ params }: PageProps<"/transactions/bill-details/[billDetailId]">) {
  const { billDetailId } = await params;
  if (!(await hasPermission("BILL_VIEW"))) redirect("/");
  return <BillDetailRecord billDetailId={billDetailId} />;
}
