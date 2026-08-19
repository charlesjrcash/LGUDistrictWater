import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { InstallationForm } from "@/modules/meter-installations/ui";

export default async function Page() {
  if (!(await hasPermission("METER_INSTALLATION_CREATE"))) redirect("/");
  return <InstallationForm />;
}
