import { ApplicationDetails } from "@/modules/service-applications/ui/application-details";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-session";
import { hasPermission } from "@/lib/permissions";

export default async function Page({ params }: { params: Promise<{ applicationNo: string }> }) {
  const { applicationNo } = await params;
  if (!await getSessionUser()) redirect(`/login?next=/transactions/service-applications/${encodeURIComponent(applicationNo)}`);
  if (!await hasPermission("SERVICE_APPLICATION_VIEW")) redirect("/");
  return <ApplicationDetails applicationNo={decodeURIComponent(applicationNo)} />;
}
