import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { BillDetail } from "@/modules/bills/ui";

export default async function Page({
  params,
}: PageProps<"/transactions/bills/[billNo]">) {
  const { billNo } = await params;
  if (!(await hasPermission("BILL_VIEW"))) redirect("/");
  return (
    <BillDetail
      billNo={decodeURIComponent(billNo)}
      canEdit={await hasPermission("BILL_EDIT")}
    />
  );
}
