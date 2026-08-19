import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { MeterReadingForm } from "@/modules/meter-readings/ui";
export default async function Page(){if(!await hasPermission("METER_READING_CREATE"))redirect("/");return <MeterReadingForm/>}
