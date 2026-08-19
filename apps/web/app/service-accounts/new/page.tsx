import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ application?: string }>;
}) {
  const application = (await searchParams).application?.trim();
  redirect(
    application
      ? `/transactions/service-accounts/new?application=${encodeURIComponent(application)}`
      : "/transactions/service-accounts/new",
  );
}
