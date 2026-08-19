"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminBrandMark } from "./admin-brand-mark";
import styles from "./admin-dashboard.module.css";

type Section =
  | "overview"
  | "operational"
  | "billing"
  | "service"
  | "health"
  | "attention"
  | "master"
  | "access"
  | "activity";
type Metrics = Record<string, number>;
export type DashboardData = {
  userName: string;
  metrics: Metrics;
  masterData: {
    category: string;
    label: string;
    count: number;
    href: string;
  }[];
  activity: {
    id: string;
    action: string;
    description: string | null;
    username: string | null;
    createdAt: string;
  }[];
  report: {
    date: string;
    collections: number;
    bills: number;
    applications: number;
  }[];
};

const groups: { label: string; items: { id: Section; label: string }[] }[] = [
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
];
const labels = Object.fromEntries(
  groups.flatMap((group) => group.items.map((item) => [item.id, item.label])),
) as Record<Section, string>;
const money = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

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
function MetricGrid({
  items,
}: {
  items: { label: string; value: number | string; hint?: string }[];
}) {
  return (
    <div className={styles.metrics}>
      {items.map((item) => (
        <article className={styles.metric} key={item.label}>
          <span>{item.label}</span>
          <strong>
            {typeof item.value === "number"
              ? item.value.toLocaleString()
              : item.value}
          </strong>
          {item.hint && <small>{item.hint}</small>}
        </article>
      ))}
    </div>
  );
}
function SectionHeader({ title, copy }: { title: string; copy: string }) {
  return (
    <header className={styles.sectionHeader}>
      <h2>{title}</h2>
      <p>{copy}</p>
    </header>
  );
}
function TrendChart({ data }: { data: DashboardData["report"] }) {
  const width = 620,
    height = 190,
    pad = 24;
  const max = Math.max(
    1,
    ...data.flatMap((item) => [item.bills, item.applications]),
  );
  const points = (key: "bills" | "applications") =>
    data
      .map(
        (item, index) =>
          `${pad + (index * (width - pad * 2)) / Math.max(1, data.length - 1)},${height - pad - (item[key] / max) * (height - pad * 2)}`,
      )
      .join(" ");
  return (
    <article className={styles.chartCard}>
      <div className={styles.chartHeading}>
        <div>
          <span>7-day activity</span>
          <strong>Bills & applications</strong>
        </div>
        <div className={styles.legend}>
          <i />
          <span>Bills</span>
          <i />
          <span>Applications</span>
        </div>
      </div>
      <svg
        className={styles.lineChart}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Bills and service applications created over the last seven days"
      >
        <defs>
          <linearGradient id="billArea" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#477eea" stopOpacity=".28" />
            <stop offset="1" stopColor="#477eea" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => (
          <line
            key={line}
            x1={pad}
            x2={width - pad}
            y1={pad + line * ((height - pad * 2) / 3)}
            y2={pad + line * ((height - pad * 2) / 3)}
            className={styles.gridLine}
          />
        ))}
        <polygon
          points={`${pad},${height - pad} ${points("bills")} ${width - pad},${height - pad}`}
          fill="url(#billArea)"
        />
        <polyline points={points("bills")} className={styles.billLine} />
        <polyline
          points={points("applications")}
          className={styles.applicationLine}
        />
        {data.map((item, index) => (
          <g key={item.date}>
            <circle
              cx={
                pad + (index * (width - pad * 2)) / Math.max(1, data.length - 1)
              }
              cy={height - pad - (item.bills / max) * (height - pad * 2)}
              r="3.5"
              className={styles.billDot}
            />
            <text
              x={
                pad + (index * (width - pad * 2)) / Math.max(1, data.length - 1)
              }
              y={height - 5}
              textAnchor="middle"
            >
              {new Intl.DateTimeFormat("en-PH", { weekday: "short" }).format(
                new Date(item.date),
              )}
            </text>
          </g>
        ))}
      </svg>
    </article>
  );
}
function CollectionBars({ data }: { data: DashboardData["report"] }) {
  const max = Math.max(1, ...data.map((item) => item.collections));
  const total = data.reduce((sum, item) => sum + item.collections, 0);
  return (
    <article className={styles.chartCard}>
      <div className={styles.chartHeading}>
        <div>
          <span>Posted collections</span>
          <strong>{money.format(total)}</strong>
        </div>
        <small>Last 7 days</small>
      </div>
      <div className={styles.barChart}>
        {data.map((item) => (
          <div
            key={item.date}
            title={`${new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(new Date(item.date))}: ${money.format(item.collections)}`}
          >
            <span
              style={{
                height: `${Math.max(4, (item.collections / max) * 100)}%`,
              }}
            />
            <small>
              {new Intl.DateTimeFormat("en-PH", { weekday: "narrow" }).format(
                new Date(item.date),
              )}
            </small>
          </div>
        ))}
      </div>
    </article>
  );
}
function BillingStatus({ total, unpaid }: { total: number; unpaid: number }) {
  const paid = Math.max(0, total - unpaid),
    rate = total ? Math.round((paid / total) * 100) : 0;
  return (
    <article className={styles.chartCard}>
      <div className={styles.chartHeading}>
        <div>
          <span>Billing status</span>
          <strong>Collection progress</strong>
        </div>
      </div>
      <div className={styles.donutWrap}>
        <div
          className={styles.donut}
          style={{
            background: `conic-gradient(#477eea 0 ${rate}%,#d9e3f8 ${rate}% 100%)`,
          }}
        >
          <span>
            <strong>{rate}%</strong>
            <small>settled</small>
          </span>
        </div>
        <div className={styles.donutStats}>
          <p>
            <i />
            {paid.toLocaleString()} settled bills
          </p>
          <p>
            <i />
            {unpaid.toLocaleString()} unpaid bills
          </p>
        </div>
      </div>
    </article>
  );
}

export function AdminDashboard({ data }: { data: DashboardData }) {
  const router = useRouter();
  const [section, setSection] = useState<Section>("overview");
  const m = data.metrics;
  const [sectionReady, setSectionReady] = useState(false);
  const [query, setQuery] = useState("");
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const firstName = data.userName.trim().split(/\s+/)[0] || "Administrator";
  const initials =
    data.userName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "SA";
  const health = [
    {
      label: "Billing Period",
      value: m.open_periods,
      href: "/maintenance/billing-periods",
    },
    {
      label: "Water Rates",
      value: m.active_rates,
      href: "/maintenance/water-rates",
    },
    { label: "Fees", value: m.active_fees, href: "/maintenance/fees" },
    {
      label: "Penalty Rates",
      value: m.active_penalties,
      href: "/maintenance/penalty-rates",
    },
    {
      label: "Reading Routes",
      value: m.active_routes,
      href: "/maintenance/reading-routes",
    },
    { label: "Document Series", value: m.active_series, href: "" },
    {
      label: "System Settings",
      value: m.active_settings,
      href: "/maintenance/system-settings",
    },
  ];
  const issues = [
    ...(m.open_periods === 0
      ? [
          {
            title: "No open billing period",
            copy: "Open a billing period before generating readings and bills.",
            href: "/maintenance/billing-periods",
          },
        ]
      : []),
    ...(m.expiring_rates > 0
      ? [
          {
            title: `${m.expiring_rates} water rate${m.expiring_rates === 1 ? "" : "s"} expiring soon`,
            copy: "Review rates that expire within the next 30 days.",
            href: "/maintenance/water-rates",
          },
        ]
      : []),
    ...(m.routes_without_barangays > 0
      ? [
          {
            title: `${m.routes_without_barangays} route${m.routes_without_barangays === 1 ? "" : "s"} without a barangay`,
            copy: "Assign each active reading route to a barangay.",
            href: "/maintenance/reading-routes",
          },
        ]
      : []),
    ...(m.temporary_passwords > 0
      ? [
          {
            title: `${m.temporary_passwords} temporary password${m.temporary_passwords === 1 ? "" : "s"} pending`,
            copy: "These active accounts have not completed their first password change.",
            href: "/register",
          },
        ]
      : []),
  ];
  const iconBySection: Record<Section, Parameters<typeof Icon>[0]["name"]> = {
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
  const normalizedQuery = query.trim().toLowerCase();
  const sectionResults = normalizedQuery
    ? groups
        .flatMap((group) =>
          group.items.map((item) => ({ ...item, group: group.label })),
        )
        .filter((item) =>
          `${item.label} ${item.group}`.toLowerCase().includes(normalizedQuery),
        )
        .slice(0, 5)
    : [];
  const masterResults = normalizedQuery
    ? data.masterData
        .filter((item) =>
          `${item.label} ${item.category}`
            .toLowerCase()
            .includes(normalizedQuery),
        )
        .slice(0, 5)
    : [];
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.sessionStorage.getItem("admin-dashboard-section");
      const valid = groups.some((group) =>
        group.items.some((item) => item.id === saved),
      );
      if (valid) setSection(saved as Section);
      setSectionReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (sectionReady)
      window.sessionStorage.setItem("admin-dashboard-section", section);
  }, [section, sectionReady]);
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
    <div className={styles.dashboard}>
      <div className={styles.mobileNav}>
        <label htmlFor="dashboard-section">Dashboard section</label>
        <select
          id="dashboard-section"
          value={section}
          onChange={(event) => setSection(event.target.value as Section)}
        >
          {groups.map((group) => (
            <optgroup label={group.label} key={group.label}>
              {group.items.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <aside className={styles.subnav}>
        <div className={styles.adminTitle}>
          <div className={styles.adminMark}>
            <AdminBrandMark />
          </div>
          <div>
            <span>System Administrator</span>
            <strong>{data.userName}</strong>
          </div>
        </div>
        {groups.map((group) => (
          <div className={styles.navGroup} key={group.label}>
            <h2>{group.label}</h2>
            {group.items.map((item) => (
              <button
                type="button"
                key={item.id}
                className={section === item.id ? styles.active : undefined}
                onClick={() => setSection(item.id)}
              >
                <Icon name={iconBySection[item.id]} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
        <div className={styles.navFooter}>
          <span>LGU Water District</span>
          <small>Administration Console</small>
        </div>
      </aside>
      <main className={styles.content}>
        <div className={styles.pageHeading}>
          <div>
            <span>
              {section === "overview"
                ? "System administration workspace"
                : labels[section]}
            </span>
            <h1>
              {section === "overview" ? (
                <>
                  Welcome back, {firstName} <b>👋</b>
                </>
              ) : (
                labels[section]
              )}
            </h1>
          </div>
          <div className={styles.profile}>
            <div>
              <strong>{data.userName}</strong>
              <span>
                <i /> System online
              </span>
            </div>
            <b>{initials}</b>
          </div>
        </div>
        {section === "overview" && (
          <>
            <SectionHeader
              title="Dashboard Overview"
              copy="A concise view of access, personnel, service coverage, and system activity."
            />
            <MetricGrid
              items={[
                { label: "Active Users", value: m.active_users },
                { label: "Active Employees", value: m.active_employees },
                { label: "Service Accounts", value: m.service_accounts },
                { label: "Activities Today", value: m.activities_today },
              ]}
            />
            <div className={styles.twoColumn}>
              <article className={styles.panel}>
                <h3>System status</h3>
                <div className={styles.statusList}>
                  {health.slice(0, 4).map((item) => (
                    <Link href={item.href} key={item.label}>
                      <i
                        className={item.value > 0 ? styles.good : styles.warn}
                      />
                      <span>
                        <strong>{item.label}</strong>
                        <small>
                          {item.value > 0
                            ? `${item.value} active configuration${item.value === 1 ? "" : "s"}`
                            : "Configuration required"}
                        </small>
                      </span>
                    </Link>
                  ))}
                </div>
              </article>
              <article className={styles.panel}>
                <h3>Important warnings</h3>
                {issues.length ? (
                  <div className={styles.issueList}>
                    {issues.slice(0, 3).map((issue) => (
                      <button
                        key={issue.title}
                        onClick={() => setSection("attention")}
                      >
                        <Icon name="warning" />
                        <span>
                          <strong>{issue.title}</strong>
                          <small>{issue.copy}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={styles.allClear}>
                    <Icon name="health" />
                    <strong>No critical warnings</strong>
                    <span>Core configuration checks are healthy.</span>
                  </div>
                )}
              </article>
            </div>
          </>
        )}
        {section === "operational" && (
          <>
            <SectionHeader
              title="Operational Overview"
              copy="Current customer, application, account, and metering activity."
            />
            <MetricGrid
              items={[
                { label: "Customers", value: m.customers },
                { label: "Applications", value: m.applications },
                {
                  label: "Pending Applications",
                  value: m.pending_applications,
                },
                { label: "Service Accounts", value: m.service_accounts },
                { label: "Meters", value: m.meters },
                { label: "Activities Today", value: m.activities_today },
              ]}
            />
            <div className={styles.quickLinks}>
              <Link href="/transactions/customers">Manage customers →</Link>
              <Link href="/transactions/service-applications">
                Review applications →
              </Link>
              <Link href="/transactions/service-accounts">
                View service accounts →
              </Link>
            </div>
          </>
        )}
        {section === "billing" && (
          <>
            <SectionHeader
              title="Billing & Collection"
              copy="Meaningful billing output, receivables, and posted collections."
            />
            <MetricGrid
              items={[
                { label: "Bills Generated", value: m.bills_generated },
                { label: "Unpaid Bills", value: m.unpaid_bills },
                { label: "Payments Today", value: m.payments_today },
                {
                  label: "Amount Collected Today",
                  value: money.format(m.collected_today),
                },
              ]}
            />
            <div className={styles.quickLinks}>
              <Link href="/maintenance/billing-periods">Billing periods →</Link>
              <Link href="/maintenance/water-rates">Water rates →</Link>
              <Link href="/maintenance/fees">Fees →</Link>
            </div>
          </>
        )}
        {section === "service" && (
          <>
            <SectionHeader
              title="Service Operations"
              copy="Application, meter, reading, installation, and field-order workload."
            />
            <MetricGrid
              items={[
                {
                  label: "Applications Pending",
                  value: m.pending_applications,
                },
                { label: "Service Accounts", value: m.service_accounts },
                { label: "Active Meters", value: m.active_meters },
                { label: "Meter Readings", value: m.meter_readings },
                { label: "Installations", value: m.installations },
                {
                  label: "Pending Disconnections",
                  value: m.pending_disconnections,
                },
                {
                  label: "Pending Reconnections",
                  value: m.pending_reconnections,
                },
              ]}
            />
            <div className={styles.quickLinks}>
              <Link href="/transactions/customers">Customers →</Link>
              <Link href="/transactions/service-applications">
                Service applications →
              </Link>
              <Link href="/transactions/service-accounts">
                Service accounts →
              </Link>
              <Link href="/transactions/meters">Meters →</Link>
              <Link href="/transactions/meter-installations">
                Meter installations →
              </Link>
              <Link href="/transactions/meter-readings">Meter readings →</Link>
            </div>
          </>
        )}
        {section === "health" && (
          <>
            <SectionHeader
              title="Configuration Health"
              copy="Checks for the active configuration required by daily operations."
            />
            <div className={styles.healthGrid}>
              {health.map((item) => {
                const body = (
                  <>
                    <i className={item.value > 0 ? styles.good : styles.warn} />
                    <span>
                      <strong>{item.label}</strong>
                      <small>
                        {item.value > 0
                          ? `${item.value} active`
                          : "Needs attention"}
                      </small>
                    </span>
                    {item.href && <b>→</b>}
                  </>
                );
                return item.href ? (
                  <Link
                    href={item.href}
                    className={styles.healthCard}
                    key={item.label}
                  >
                    {body}
                  </Link>
                ) : (
                  <div className={styles.healthCard} key={item.label}>
                    {body}
                  </div>
                );
              })}
            </div>
          </>
        )}
        {section === "attention" && (
          <>
            <SectionHeader
              title="System Attention"
              copy="Only current issues that require an administrator action are shown."
            />
            {issues.length ? (
              <div className={styles.attentionList}>
                {issues.map((issue) => (
                  <article key={issue.title}>
                    <Icon name="warning" />
                    <div>
                      <h3>{issue.title}</h3>
                      <p>{issue.copy}</p>
                    </div>
                    <Link href={issue.href}>Resolve →</Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className={`${styles.panel} ${styles.empty}`}>
                <Icon name="health" />
                <h3>Everything looks healthy</h3>
                <p>There are no actionable system warnings right now.</p>
              </div>
            )}
          </>
        )}
        {section === "master" && (
          <>
            <SectionHeader
              title="Master Data"
              copy="Summary counts and direct links to the existing maintenance forms."
            />
            <div className={styles.masterGroups}>
              {Array.from(
                new Set(data.masterData.map((item) => item.category)),
              ).map((category) => (
                <section className={styles.panel} key={category}>
                  <h3>{category}</h3>
                  {data.masterData
                    .filter((item) => item.category === category)
                    .map((item) => (
                      <Link href={item.href} key={item.label}>
                        <span>{item.label}</span>
                        <b>{item.count.toLocaleString()}</b>
                        <i>→</i>
                      </Link>
                    ))}
                </section>
              ))}
            </div>
          </>
        )}
        {section === "access" && (
          <>
            <SectionHeader
              title="Users & Access"
              copy="Account totals and links to role-based access administration."
            />
            <MetricGrid
              items={[
                { label: "Total Users", value: m.total_users },
                { label: "Active Users", value: m.active_users },
                { label: "Roles", value: m.roles },
                { label: "Permissions", value: m.permissions },
                { label: "System Modules", value: m.modules },
              ]}
            />
            <div className={styles.quickLinks}>
              <Link href="/register">User management →</Link>
              <Link href="/maintenance/roles">Roles →</Link>
              <Link href="/maintenance/permissions">Permissions →</Link>
              <Link href="/maintenance/role-permissions">
                Role permissions →
              </Link>
              <Link href="/maintenance/system-modules">System modules →</Link>
            </div>
          </>
        )}
        {section === "activity" && (
          <>
            <SectionHeader
              title="Recent Activity / Audit Logs"
              copy="The latest recorded actions across the system."
            />
            <div className={styles.activityPanel}>
              {data.activity.length ? (
                data.activity.map((item) => (
                  <article key={item.id}>
                    <span className={styles.activityIcon}>
                      <Icon name="activity" />
                    </span>
                    <div>
                      <strong>{item.description || item.action}</strong>
                      <small>
                        {item.username || "System"} ·{" "}
                        {new Intl.DateTimeFormat("en-PH", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(item.createdAt))}
                      </small>
                    </div>
                    <em>{item.action}</em>
                  </article>
                ))
              ) : (
                <div className={styles.empty}>
                  <p>No audit activity has been recorded yet.</p>
                </div>
              )}
            </div>
          </>
        )}
        {section === "overview" && (
          <section className={styles.reportsSection}>
            <div className={styles.reportsHeading}>
              <div>
                <span>Live reports</span>
                <h2>Operational movement</h2>
              </div>
              <small>Last 7 days</small>
            </div>
            <div className={styles.reportGrid}>
              <TrendChart data={data.report} />
              <CollectionBars data={data.report} />
            </div>
          </section>
        )}
        {section === "billing" && (
          <section className={styles.reportsSection}>
            <div className={styles.reportsHeading}>
              <div>
                <span>Billing reports</span>
                <h2>Collection performance</h2>
              </div>
              <small>Live database data</small>
            </div>
            <div className={styles.billingReports}>
              <CollectionBars data={data.report} />
              <BillingStatus
                total={m.bills_generated}
                unpaid={m.unpaid_bills}
              />
            </div>
          </section>
        )}
        <div className={styles.searchControl}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search dashboard or master data"
            aria-label="Search dashboard"
          />
          {normalizedQuery && (
            <div className={styles.searchResults}>
              {sectionResults.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setSection(item.id);
                    setQuery("");
                  }}
                >
                  <span>{item.label}</span>
                  <small>{item.group}</small>
                </button>
              ))}
              {masterResults.map((item) => (
                <Link
                  href={item.href}
                  key={`${item.category}-${item.label}`}
                  onClick={() => setQuery("")}
                >
                  <span>{item.label}</span>
                  <small>
                    {item.category} · {item.count.toLocaleString()} records
                  </small>
                </Link>
              ))}
              {sectionResults.length === 0 && masterResults.length === 0 && (
                <p>No matching dashboard section or master data page.</p>
              )}
            </div>
          )}
        </div>
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
        {confirmLogout && (
          <div
            className={styles.logoutBackdrop}
            role="presentation"
            onMouseDown={() => !loggingOut && setConfirmLogout(false)}
          >
            <div
              className={styles.logoutDialog}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="logout-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className={styles.logoutIcon}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M10 5H5v14h5M14 8l4 4-4 4m4-4H9" />
                </svg>
              </div>
              <h2 id="logout-title">Log out of your account?</h2>
              <p>
                You will need to sign in again to access the administration
                dashboard.
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => setConfirmLogout(false)}
                  disabled={loggingOut}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void logout()}
                  disabled={loggingOut}
                >
                  {loggingOut ? "Logging out..." : "Yes, log out"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
