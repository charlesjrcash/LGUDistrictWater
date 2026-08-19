import { EditAccountForm } from "@/modules/service-accounts/ui/edit-account-form";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";

export default async function Page({ params }: { params: Promise<{ controlNo: string }> }) { const { controlNo } = await params; if (!await hasPermission("SERVICE_ACCOUNT_EDIT")) redirect("/"); return <EditAccountForm controlNo={decodeURIComponent(controlNo)} />; }
