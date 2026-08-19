import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { AdjustmentForm } from "../ui";
export default async function Page() { if (!(await hasPermission("BILL_CREATE"))) redirect("/"); return <AdjustmentForm />; }
