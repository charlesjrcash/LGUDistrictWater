import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { MeterReadingForm } from "@/modules/meter-readings/ui";
import { Modal } from "@/modules/shared/ui/modal";

export default async function Page({
  params,
}: {
  params: Promise<{ readingId: string }>;
}) {
  const { readingId } = await params;
  if (!(await hasPermission("METER_READING_EDIT"))) redirect("/");
  return (
    <Modal wide>
      <MeterReadingForm readingId={decodeURIComponent(readingId)} variant="modal" />
    </Modal>
  );
}
