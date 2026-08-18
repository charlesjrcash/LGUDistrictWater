import { ApplicationDetails } from "@/modules/service-applications/ui/application-details";

export default async function Page({ params }: { params: Promise<{ applicationNo: string }> }) {
  const { applicationNo } = await params;
  return <ApplicationDetails applicationNo={decodeURIComponent(applicationNo)} />;
}
