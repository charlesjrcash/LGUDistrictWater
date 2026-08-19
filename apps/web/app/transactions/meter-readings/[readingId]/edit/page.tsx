import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { MeterReadingForm } from "@/modules/meter-readings/ui";

export default async function Page({
  params,
}: PageProps<"/transactions/meter-readings/[readingId]/edit">) {
  const { readingId } = await params;
  if (!(await hasPermission("METER_READING_EDIT"))) redirect("/");
  return <MeterReadingForm readingId={decodeURIComponent(readingId)} />;
}
