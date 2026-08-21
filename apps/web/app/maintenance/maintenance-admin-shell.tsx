"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminBrandMark } from "@/modules/dashboard/ui/admin-brand-mark";
import styles from "@/modules/dashboard/ui/admin-dashboard.module.css";
import {
  accessNavigation,
  maintenanceNavigation,
  transactionNavigation,
} from "@/lib/permission-navigation";

const allGroups = [
  {
    label: "Overview",
    items: [{ id: "overview", label: "Dashboard Overview" }],
  },
  {
    label: "Monitoring",
    items: [
      { id: "operational", label: "Application Overview" },
      { id: "billing", label: "Billing & Collection" },
      { id: "service", label: "Service Operations" },
    ],
  },
  {
    label: "System Health",
    items: [
      { id: "health", label: "Configuration Health" },
      { id: "attention", label: "System Attention" },
    ],
  },
  {
    label: "Administration",
    items: [
      { id: "master", label: "Master Data" },
      { id: "access", label: "Users & Access" },
      { id: "activity", label: "Recent Activity" },
    ],
  },
] as const;

const operationalPermissions = transactionNavigation
  .filter((item) => !item.permissions.some((permission) => permission.startsWith("BILL")))
  .flatMap((item) => item.permissions);
const billingPermissions = transactionNavigation
  .filter((item) => item.permissions.some((permission) => permission.startsWith("BILL")))
  .flatMap((item) => item.permissions);

function Icon({
  name,
}: {
  name:
    | "overview"
    | "monitor"
    | "billing"
    | "service"
    | "health"
    | "warning"
    | "data"
    | "users"
    | "activity";
}) {
  const paths = {
    overview: "M4 4h6v6H4zM14 4h6v10h-6zM4 14h6v6H4zM14 18h6v2h-6z",
    monitor: "M4 19V9m5 10V5m5 14v-7m5 7V3",
    billing: "M4 5h16v14H4zM7 9h10M7 13h4",
    service: "M12 3v4m0 10v4M3 12h4m10 0h4M6 6l3 3m6 6 3 3m0-12-3 3m-6 6-3 3",
    health: "M12 21s8-4 8-10V5l-8-3-8 3v6c0 6 8 10 8 10zm-3-9 2 2 4-5",
    warning: "M12 3 2 21h20L12 3zm0 6v5m0 3h.01",
    data: "M4 6c0-2 16-2 16 0s-16 2-16 0zm0 0v6c0 2 16 2 16 0V6m-16 6v6c0 2 16 2 16 0v-6",
    users:
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    activity: "M3 12h4l2-6 4 12 2-6h6",
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={paths[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
const iconBySection: Record<string, Parameters<typeof Icon>[0]["name"]> = {
  overview: "overview",
  operational: "monitor",
  billing: "billing",
  service: "service",
  health: "health",
  attention: "warning",
  master: "data",
  access: "users",
  activity: "activity",
};

export function MaintenanceAdminShell({
  children,
  activeSection = "master",
  permissions,
  userName = "Bagamanoc",
  systemAdministrator = false,
}: {
  children: ReactNode;
  activeSection?: string;
  permissions: readonly string[];
  userName?: string;
  systemAdministrator?: boolean;
}) {
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const permissionSet = new Set(permissions);
  const hasAny = (codes: readonly string[]) =>
    codes.some((permission) => permissionSet.has(permission));
  const visibleSections = new Set([
    ...(permissionSet.has("DASHBOARD_VIEW") ? ["overview"] : []),
    ...(hasAny(operationalPermissions) ? ["operational", "service"] : []),
    ...(hasAny([...billingPermissions, "PAYMENT_VIEW", "REPORT_VIEW"]) ? ["billing"] : []),
    ...(hasAny(maintenanceNavigation.flatMap((item) => item.permissions))
      ? ["health", "master"]
      : []),
    ...(hasAny(maintenanceNavigation.flatMap((item) => item.permissions)) && systemAdministrator
      ? ["attention"]
      : []),
    ...(hasAny(accessNavigation.flatMap((item) => item.permissions))
      ? ["access", "activity"]
      : []),
  ]);
  const groups = allGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => visibleSections.has(item.id)),
    }))
    .filter((group) => group.items.length > 0);
  function openSection(section: string) {
    window.sessionStorage.setItem("admin-dashboard-section", section);
    router.push("/dashboard");
  }
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }
  return (
    <div
      className={`${styles.adminFormShell} ${sidebarCollapsed ? styles.collapsedShell : ""}`}
    >
      <aside
        className={`${styles.subnav} ${styles.formSidebar} ${sidebarCollapsed ? styles.collapsedSidebar : ""}`}
      >
        <div className={styles.adminTitle}>
          <div className={styles.adminMark}>
            <AdminBrandMark />
          </div>
          <div>
            <span>{systemAdministrator ? "System Administrator" : "Authorized workspace"}</span>
            <strong>{userName}</strong>
          </div>
        </div>
        <button
          type="button"
          className={styles.sidebarToggle}
          onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={sidebarCollapsed ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"} />
          </svg>
        </button>
        {groups.map((group) => (
          <div className={styles.navGroup} key={group.label}>
            <h2>{group.label}</h2>
            {group.items.map((item) => (
              <button
                type="button"
                key={item.id}
                title={sidebarCollapsed ? item.label : undefined}
                className={
                  item.id === activeSection ? styles.active : undefined
                }
                onClick={() => openSection(item.id)}
              >
                <Icon name={iconBySection[item.id]} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
        <button
          type="button"
          className={styles.logoutButton}
          onClick={() => setConfirmLogout(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 5H5v14h5M14 8l4 4-4 4m4-4H9" />
          </svg>
          <span>Log out</span>
        </button>
      </aside>
      <main className={`${styles.adminFormContent} ${styles.adminFormTheme}`}>
        {children}
      </main>
      {confirmLogout && (
        <div
          className={styles.logoutBackdrop}
          onMouseDown={() => !loggingOut && setConfirmLogout(false)}
        >
          <div
            className={styles.logoutDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="maintenance-logout-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.logoutIcon}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 5H5v14h5M14 8l4 4-4 4m4-4H9" />
              </svg>
            </div>
            <h2 id="maintenance-logout-title">Log out of your account?</h2>
            <p>
              You will need to sign in again to access the administration
              dashboard.
            </p>
            <div>
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => setConfirmLogout(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => void logout()}
              >
                {loggingOut ? "Logging out..." : "Yes, log out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
