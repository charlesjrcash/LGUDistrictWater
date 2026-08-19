import { ApplicationForm } from "@/modules/service-applications/ui/application-form";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-session";
import { hasPermission } from "@/lib/permissions";

export default async function Page({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  if (!await getSessionUser()) redirect("/login?next=/transactions/service-applications/new");
  if (!await hasPermission("SERVICE_APPLICATION_CREATE")) redirect("/");
  const { customer } = await searchParams;
  return <ApplicationForm initialCustomerNo={customer?.trim()} />;
}
