import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { MobileReturnsPage } from "@/modules/meter-readings/mobile-returns";

export default async function Page() { if (!(await hasPermission("METER_READING_VIEW"))) redirect("/"); return <MobileReturnsPage />; }
