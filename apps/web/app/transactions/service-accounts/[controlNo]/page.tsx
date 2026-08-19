import { AccountDetails } from "@/modules/service-accounts/ui/account-details";

export default async function Page({
  params,
}: {
  params: Promise<{ controlNo: string }>;
}) {
  const { controlNo } = await params;
  return <AccountDetails controlNo={decodeURIComponent(controlNo)} />;
}
