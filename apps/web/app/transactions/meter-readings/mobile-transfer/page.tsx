import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { MobileTransferPage } from "@/modules/meter-readings/mobile-transfer";

export default async function Page() {
  if (!(await hasPermission("METER_READING_VIEW"))) redirect("/");
  return <MobileTransferPage canPrepare={await hasPermission("METER_READING_CREATE")} />;
}
