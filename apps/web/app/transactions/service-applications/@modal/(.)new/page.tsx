import { ApplicationForm } from "@/modules/service-applications/ui/application-form";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-session";
import { hasPermission } from "@/lib/permissions";
import { Modal } from "@/modules/shared/ui/modal";

export default async function Page() {
  if (!(await getSessionUser()))
    redirect("/login?next=/transactions/service-applications/new");
  if (!(await hasPermission("SERVICE_APPLICATION_CREATE"))) redirect("/");
  return (
    <Modal wide>
      <ApplicationForm variant="modal" />
    </Modal>
  );
}
