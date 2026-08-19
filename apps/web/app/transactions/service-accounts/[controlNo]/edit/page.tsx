import { EditAccountForm } from "@/modules/service-accounts/ui/edit-account-form";

export default async function Page({ params }: { params: Promise<{ controlNo: string }> }) { const { controlNo } = await params; return <EditAccountForm controlNo={decodeURIComponent(controlNo)} />; }
