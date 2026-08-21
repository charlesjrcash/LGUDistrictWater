import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { MeterForm } from "@/modules/meters/ui";
import { Modal } from "@/modules/shared/ui/modal";

export default async function Page() {
  if (!(await hasPermission("METER_CREATE"))) redirect("/");
  return (
    <Modal wide>
      <MeterForm variant="modal" />
    </Modal>
  );
}
