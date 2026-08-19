import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-session";
import { MaintenanceAdminShell } from "@/app/maintenance/maintenance-admin-shell";

export default async function TransactionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/transactions/service-applications");
  if (!user.roles.some((role) => role.toLowerCase().includes("admin")))
    redirect("/");

  return (
    <MaintenanceAdminShell activeSection="service">
      <div className="px-8 pt-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
        >
          <span aria-hidden="true">←</span> Back to Service Operations
        </Link>
      </div>
      {children}
    </MaintenanceAdminShell>
  );
}
