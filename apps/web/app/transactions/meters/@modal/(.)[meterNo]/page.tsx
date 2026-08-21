import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { MeterDetail } from "@/modules/meters/ui";
import { Modal } from "@/modules/shared/ui/modal";

export default async function Page({
  params,
}: {
  params: Promise<{ meterNo: string }>;
}) {
  const { meterNo } = await params;
  if (!(await hasPermission("METER_VIEW"))) redirect("/");
  return (
    <Modal wide>
      <MeterDetail
        meterNo={decodeURIComponent(meterNo)}
        canEdit={await hasPermission("METER_EDIT")}
        variant="modal"
      />
    </Modal>
  );
}
