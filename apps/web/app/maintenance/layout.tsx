import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/server-session";
import { MaintenanceAdminShell } from "./maintenance-admin-shell";

export default async function MaintenanceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.roles.some((role) => role.toLowerCase().includes("admin")))
    redirect("/");
  return (
    <MaintenanceAdminShell>
      <div className="px-8 pt-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
        >
          <span aria-hidden="true">←</span> Back to previous dashboard section
        </Link>
      </div>
      {children}
    </MaintenanceAdminShell>
  );
}
