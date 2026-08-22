import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUserPermissions, isMfaEligible } from "@/lib/permissions";
import { MaintenanceAdminShell } from "@/app/maintenance/maintenance-admin-shell";
import { MfaSettingsForm } from "@/modules/account/security/mfa-settings-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Security settings",
};

export default async function AccountSecurityPage() {
  const auth = await getCurrentUserPermissions();
  if (auth.response) redirect("/login?next=/account/security");
  if (!isMfaEligible(auth.permissions)) redirect("/dashboard");

  const result = await db.query<{ email: string | null; mfa_enabled: boolean }>(
    "SELECT email, mfa_enabled FROM users WHERE user_id = $1",
    [auth.user.userId],
  );
  const account = result.rows[0];

  return (
    <MaintenanceAdminShell
      permissions={auth.permissions}
      userName={auth.user.name || auth.user.username}
      systemAdministrator={auth.user.roles.some(
        (role) => role.toLowerCase() === "system administrator",
      )}
    >
      <div className="mx-auto max-w-xl px-8 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Security settings</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage two-factor sign-in for {auth.user.username}.
        </p>
        <div className="mt-6">
          <MfaSettingsForm
            email={account?.email ?? null}
            mfaEnabled={account?.mfa_enabled ?? false}
          />
        </div>
      </div>
    </MaintenanceAdminShell>
  );
}
