import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-session";

export default async function ServiceApplicationsLayout({ children }: { children: ReactNode }) {
  if (!await getSessionUser()) redirect("/login?next=/service-applications");
  return children;
}
