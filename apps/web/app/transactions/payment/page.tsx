import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { PaymentForm } from "../payment-form";

export default async function Page() {
  if (!(await hasPermission("BILL_EDIT"))) redirect("/transactions");
  return <PaymentForm />;
}
