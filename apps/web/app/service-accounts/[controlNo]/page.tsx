import { AccountDetails } from "@/modules/service-accounts/ui/account-details";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";

export default async function Page({ params }: { params: Promise<{ controlNo: string }> }) { const { controlNo } = await params; if (!await hasPermission("SERVICE_ACCOUNT_VIEW")) redirect("/"); return <AccountDetails controlNo={decodeURIComponent(controlNo)} canEdit={await hasPermission("SERVICE_ACCOUNT_EDIT")} />; }
