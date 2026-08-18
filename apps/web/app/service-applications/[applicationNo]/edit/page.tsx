import { ApplicationForm } from "@/modules/service-applications/ui/application-form";

export default async function Page({ params }: { params: Promise<{ applicationNo: string }> }) {
  const { applicationNo } = await params;
  return <ApplicationForm applicationNo={decodeURIComponent(applicationNo)} />;
}
