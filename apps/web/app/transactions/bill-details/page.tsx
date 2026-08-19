import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { BillDetailsPage } from "./ui";

export default async function Page() {
  if (!(await hasPermission("BILL_VIEW"))) redirect("/");
  return <BillDetailsPage />;
}
