import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserPermissions } from "@/lib/permissions";
import { accessNavigation, maintenanceNavigation } from "@/lib/permission-navigation";
import { MaintenanceAdminShell } from "./maintenance-admin-shell";

export default async function MaintenanceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const auth = await getCurrentUserPermissions();
  if (auth.response) redirect("/login");
  const permissionSet = new Set(auth.permissions);
  if (![...maintenanceNavigation, ...accessNavigation].some((item) =>
    item.permissions.some((permission) => permissionSet.has(permission)))) redirect("/");
  return (
    <MaintenanceAdminShell
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
          <span aria-hidden="true">←</span> Back to previous dashboard section
        </Link>
      </div>
      {children}
    </MaintenanceAdminShell>
  );
}
