import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { MeterForm } from "@/modules/meters/ui";

export default async function Page() {
  if (!(await hasPermission("METER_CREATE"))) redirect("/");
  return <MeterForm />;
}
