import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { BillsPage } from "@/modules/bills/ui";

export default async function Page() {
  if (!(await hasPermission("BILL_VIEW"))) redirect("/");
  const [canCreate, canEdit] = await Promise.all([
    hasPermission("BILL_CREATE"),
    hasPermission("BILL_EDIT"),
  ]);
  return <BillsPage canCreate={canCreate} canEdit={canEdit} />;
}
