import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { MeterReadingDetail } from "@/modules/meter-readings/ui";

export default async function Page({
  params,
}: PageProps<"/transactions/meter-readings/[readingId]">) {
  const { readingId } = await params;
  if (!(await hasPermission("METER_READING_VIEW"))) redirect("/");
  return (
    <MeterReadingDetail
      readingId={decodeURIComponent(readingId)}
      canEdit={await hasPermission("METER_READING_EDIT")}
    />
  );
}
