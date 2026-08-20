import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { MeterForm } from "@/modules/meters/ui";

export default async function Page({
  params,
}: { params: Promise<{ meterNo: string }> }) {
  const { meterNo } = await params;
  if (!(await hasPermission("METER_EDIT"))) redirect("/");
  return <MeterForm meterNo={decodeURIComponent(meterNo)} />;
}
