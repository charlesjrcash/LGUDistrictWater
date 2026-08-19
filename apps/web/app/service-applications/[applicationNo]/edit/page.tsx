import { ApplicationForm } from "@/modules/service-applications/ui/application-form";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-session";
import { hasPermission } from "@/lib/permissions";

export default async function Page({ params }: { params: Promise<{ applicationNo: string }> }) {
  const { applicationNo } = await params;
  if (!await getSessionUser()) redirect(`/login?next=/service-applications/${encodeURIComponent(applicationNo)}/edit`);
  if (!await hasPermission("SERVICE_APPLICATION_EDIT")) redirect("/");
  return <ApplicationForm applicationNo={decodeURIComponent(applicationNo)} />;
}
