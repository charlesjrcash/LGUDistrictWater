"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/modules/dashboard/ui/admin-dashboard.module.css";

const groups = [
  {
    label: "Overview",
    items: [{ id: "overview", label: "Dashboard Overview" }],
  },
  {
    label: "Monitoring",
    items: [
      { id: "operational", label: "Operational Overview" },
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

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

export function MaintenanceAdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
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
    <div className={styles.adminFormShell}>
      <aside className={`${styles.subnav} ${styles.formSidebar}`}>
        <div className={styles.adminTitle}>
          <div className={styles.adminMark}>BW</div>
          <div>
            <span>System Administrator</span>
            <strong>Bagamanoc</strong>
          </div>
        </div>
        {groups.map((group) => (
          <div className={styles.navGroup} key={group.label}>
            <h2>{group.label}</h2>
            {group.items.map((item) => (
              <button
                type="button"
                key={item.id}
                className={item.id === "master" ? styles.active : undefined}
                onClick={() => openSection(item.id)}
              >
                <MenuIcon />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </aside>
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
      <main className={styles.adminFormContent}>{children}</main>
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
