import { ApplicationForm } from "@/modules/service-applications/ui/application-form";

export default async function Page({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const { customer } = await searchParams;
  return <ApplicationForm initialCustomerNo={customer?.trim()} />;
}
