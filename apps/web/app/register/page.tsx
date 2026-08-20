import type { Metadata } from "next";
import { redirect } from "next/navigation";
import RegistrationForm from "../registration-form";
import { getActiveEmployees, getActiveRoles } from "@/lib/roles";
import { connection } from "next/server";
import { getCurrentUserPermissions } from "@/lib/permissions";
import { MaintenanceAdminShell } from "@/app/maintenance/maintenance-admin-shell";

export const metadata: Metadata = {
  title: "Create User Account",
  description:
    "Create a system user account for the Bagamanoc Water Billing System.",
};

export default async function RegisterPage() {
  await connection();

  const auth = await getCurrentUserPermissions();
  if (auth.response) redirect("/login?next=/register");
  if (!auth.permissions.includes("USER_CREATE")) redirect("/dashboard");

  const [initialRoles, initialEmployees] = await Promise.all([
    getActiveRoles(),
    getActiveEmployees(),
  ]);

  return (
    <MaintenanceAdminShell
      activeSection="access"
      permissions={auth.permissions}
      userName={auth.user.name || auth.user.username}
      systemAdministrator={auth.user.roles.some(
        (role) => role.toLowerCase() === "system administrator",
      )}
    >
      <div className="px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            LGU District Water
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Create a user account
          </h1>

            <p className="mt-2 text-slate-600">
              Select an employee and assign their system access role.
            </p>
          </div>

          <RegistrationForm
            initialRoles={initialRoles}
            initialEmployees={initialEmployees}
          />
        </div>
      </div>
    </MaintenanceAdminShell>
  );
}
