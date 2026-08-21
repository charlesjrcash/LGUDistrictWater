export type TransactionCategory = "operational" | "billing";

export type TransactionModule = {
  slug: string;
  label: string;
  category: TransactionCategory;
  permission: string;
};

/**
 * Single source of truth for transaction modules shown on the dashboard.
 * Add a route folder under app/transactions, then register its label and
 * category here; the matching dashboard section renders it automatically.
 */
export const transactionModules: readonly TransactionModule[] = [
  { slug: "customers", label: "Customers", category: "operational", permission: "CUSTOMER_VIEW" },
  {
    slug: "service-applications",
    label: "Service applications",
    category: "operational",
    permission: "SERVICE_APPLICATION_VIEW",
  },
  {
    slug: "service-accounts",
    label: "Service accounts",
    category: "operational",
    permission: "SERVICE_ACCOUNT_VIEW",
  },
  { slug: "meters", label: "Meters", category: "operational", permission: "METER_VIEW" },
  {
    slug: "meter-installations",
    label: "Meter installations",
    category: "operational",
    permission: "METER_INSTALLATION_VIEW",
  },
  {
    slug: "service-installations",
    label: "Service installations",
    category: "operational",
    permission: "METER_INSTALLATION_VIEW",
  },
  {
    slug: "meter-readings",
    label: "Meter readings",
    category: "operational",
    permission: "METER_READING_VIEW",
  },
  { slug: "bills", label: "Bills", category: "billing", permission: "BILL_VIEW" },
  { slug: "bill-details", label: "Bill details", category: "billing", permission: "BILL_DETAIL_VIEW" },
  { slug: "bill-penalties", label: "Bill penalties", category: "billing", permission: "BILL_PENALTY_VIEW" },
  {
    slug: "bill-adjustments",
    label: "Bill adjustments",
    category: "billing",
    permission: "BILL_ADJUSTMENT_VIEW",
  },
] as const;

export function transactionsByCategory(category: TransactionCategory) {
  return transactionModules.filter((item) => item.category === category);
}

export function transactionHref(transaction: TransactionModule) {
  return `/transactions/${transaction.slug}`;
}
