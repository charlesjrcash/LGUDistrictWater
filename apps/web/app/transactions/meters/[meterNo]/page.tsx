import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { MeterDetail } from "@/modules/meters/ui";

export default async function Page({
  params,
}: PageProps<"/transactions/meters/[meterNo]">) {
  const { meterNo } = await params;
  if (!(await hasPermission("METER_VIEW"))) redirect("/");
  return (
    <MeterDetail
      meterNo={decodeURIComponent(meterNo)}
      canEdit={await hasPermission("METER_EDIT")}
    />
  );
}
