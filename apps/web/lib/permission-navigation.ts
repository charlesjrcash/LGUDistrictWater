export type PermissionNavigationItem = {
  label: string;
  href: string;
  permissions: readonly string[];
};

export const transactionNavigation: readonly PermissionNavigationItem[] = [
  { label: "Customers", href: "/transactions/customers", permissions: ["CUSTOMER_VIEW"] },
  { label: "Service applications", href: "/transactions/service-applications", permissions: ["SERVICE_APPLICATION_VIEW"] },
  { label: "Service accounts", href: "/transactions/service-accounts", permissions: ["SERVICE_ACCOUNT_VIEW"] },
  { label: "Billing inquiry", href: "/billing-inquiry", permissions: ["BILLING_INQUIRY_VIEW"] },
  { label: "Meters", href: "/transactions/meters", permissions: ["METER_VIEW"] },
  { label: "Meter installations", href: "/transactions/meter-installations", permissions: ["METER_INSTALLATION_VIEW"] },
  { label: "Disconnection orders", href: "/transactions/disconnection-orders", permissions: ["METER_INSTALLATION_VIEW"] },
  { label: "Service installations", href: "/transactions/service-installations", permissions: ["METER_INSTALLATION_VIEW"] },
  { label: "Meter readings", href: "/transactions/meter-readings", permissions: ["METER_READING_VIEW"] },
  { label: "Bills", href: "/transactions/bills", permissions: ["BILL_VIEW"] },
  { label: "Connection fees", href: "/transactions/connection-fees", permissions: ["BILL_VIEW"] },
  { label: "Bill adjustments", href: "/transactions/bill-adjustments", permissions: ["BILL_ADJUSTMENT_VIEW"] },
  { label: "Bill details", href: "/transactions/bill-details", permissions: ["BILL_DETAIL_VIEW"] },
  { label: "Bill penalties", href: "/transactions/bill-penalties", permissions: ["BILL_PENALTY_VIEW"] },
] as const;

export const maintenanceNavigation: readonly PermissionNavigationItem[] = [
  ["Application statuses", "application-statuses", "APPLICATION_STATUS_VIEW"],
  ["Application types", "application-types", "APPLICATION_TYPE_VIEW"],
  ["Barangays", "barangays", "BARANGAY_VIEW"],
  ["Billing cycles", "billing-cycles", "BILLING_CYCLE_VIEW"],
  ["Billing periods", "billing-periods", "BILLING_PERIOD_VIEW"],
  ["Connection statuses", "connection-statuses", "CONNECTION_STATUS_VIEW"],
  ["Connection types", "connection-types", "CONNECTION_TYPE_VIEW"],
  ["Customer classifications", "customer-classifications", "CUSTOMER_CLASSIFICATION_VIEW"],
  ["Disconnection reasons", "disconnection-reasons", "DISCONNECTION_REASON_VIEW"],
  ["Due date rules", "due-date-rules", "DUE_DATE_RULE_VIEW"],
  ["Employees", "employees", "EMPLOYEE_VIEW"],
  ["Fees", "fees", "FEE_VIEW"],
  ["Materials", "materials", "MATERIAL_VIEW"],
  ["Meter brands", "meter-brands", "METER_BRAND_VIEW"],
  ["Meter readers", "meter-readers", "METER_READER_VIEW"],
  ["Meter sizes", "meter-sizes", "METER_SIZE_VIEW"],
  ["Meter types", "meter-types", "METER_TYPE_VIEW"],
  ["Payment methods", "payment-methods", "PAYMENT_METHOD_VIEW"],
  ["Payment types", "payment-types", "PAYMENT_TYPE_VIEW"],
  ["Penalty rates", "penalty-rates", "PENALTY_RATE_VIEW"],
  ["Puroks", "puroks", "PUROK_VIEW"],
  ["Reading routes", "reading-routes", "READING_ROUTE_VIEW"],
  ["Reading statuses", "reading-statuses", "READING_STATUS_VIEW"],
  ["Receipt types", "receipt-types", "RECEIPT_TYPE_VIEW"],
  ["Service types", "service-types", "SERVICE_TYPE_VIEW"],
  ["Units", "units", "UNIT_VIEW"],
  ["Water rates", "water-rates", "WATER_RATE_VIEW"],
].map(([label, slug, permission]) => ({
  label,
  href: `/maintenance/${slug}`,
  permissions: [permission],
}));

export const accessNavigation: readonly PermissionNavigationItem[] = [
  { label: "Users", href: "/register", permissions: ["USER_VIEW", "USER_CREATE"] },
  { label: "Roles", href: "/maintenance/roles", permissions: ["ROLE_VIEW"] },
  { label: "Permissions", href: "/maintenance/permissions", permissions: ["PERMISSION_VIEW"] },
  { label: "Role permissions", href: "/maintenance/role-permissions", permissions: ["ROLE_PERMISSION_VIEW"] },
  { label: "System modules", href: "/maintenance/system-modules", permissions: ["SYSTEM_MODULE_VIEW"] },
  { label: "System settings", href: "/maintenance/system-settings", permissions: ["SYSTEM_SETTING_VIEW"] },
] as const;

export function canAccessItem(item: PermissionNavigationItem, permissions: ReadonlySet<string>) {
  return item.permissions.some((permission) => permissions.has(permission));
}

export function visibleNavigation(items: readonly PermissionNavigationItem[], permissions: ReadonlySet<string>) {
  return items.filter((item) => canAccessItem(item, permissions));
}
