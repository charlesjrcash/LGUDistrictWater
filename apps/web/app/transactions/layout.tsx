import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserPermissions } from "@/lib/permissions";
import { transactionNavigation } from "@/lib/permission-navigation";
import { MaintenanceAdminShell } from "@/app/maintenance/maintenance-admin-shell";

export default async function TransactionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const auth = await getCurrentUserPermissions();
  if (auth.response) redirect("/login?next=/transactions/service-applications");
  const permissionSet = new Set(auth.permissions);
  if (!transactionNavigation.some((item) => item.permissions.some((permission) => permissionSet.has(permission)))) redirect("/");

  return (
    <MaintenanceAdminShell
      activeSection="service"
      permissions={auth.permissions}
      userName={auth.user.name || auth.user.username}
      systemAdministrator={auth.user.roles.some(
        (role) => role.toLowerCase() === "system administrator",
      )}
    >
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
