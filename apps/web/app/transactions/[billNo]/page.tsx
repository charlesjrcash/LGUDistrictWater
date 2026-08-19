import { redirect } from "next/navigation";
export default async function Page({
  params,
}: PageProps<"/transactions/[billNo]">) {
  const { billNo } = await params;
  redirect(
    `/transactions/bills/${encodeURIComponent(decodeURIComponent(billNo))}`,
  );
}
