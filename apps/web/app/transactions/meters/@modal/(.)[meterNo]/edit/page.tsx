import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { MeterForm } from "@/modules/meters/ui";
import { Modal } from "@/modules/shared/ui/modal";

export default async function Page({
  params,
}: {
  params: Promise<{ meterNo: string }>;
}) {
  const { meterNo } = await params;
  if (!(await hasPermission("METER_EDIT"))) redirect("/");
  return (
    <Modal wide>
      <MeterForm meterNo={decodeURIComponent(meterNo)} variant="modal" />
    </Modal>
  );
}
