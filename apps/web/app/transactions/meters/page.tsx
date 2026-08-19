import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { MetersPage } from "@/modules/meters/ui";

export default async function Page() {
  if (!(await hasPermission("METER_VIEW"))) redirect("/");
  const [canCreate, canEdit] = await Promise.all([
    hasPermission("METER_CREATE"),
    hasPermission("METER_EDIT"),
  ]);
  return <MetersPage canCreate={canCreate} canEdit={canEdit} />;
}
