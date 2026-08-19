import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { MeterReadingsPage } from "@/modules/meter-readings/ui";
export default async function Page(){if(!await hasPermission("METER_READING_VIEW"))redirect("/");const[canCreate,canEdit]=await Promise.all([hasPermission("METER_READING_CREATE"),hasPermission("METER_READING_EDIT")]);return <MeterReadingsPage canCreate={canCreate} canEdit={canEdit}/>}
