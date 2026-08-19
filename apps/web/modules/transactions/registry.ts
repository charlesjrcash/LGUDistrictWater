export type TransactionCategory = "operational" | "billing";

export type TransactionModule = {
  slug: string;
  label: string;
  category: TransactionCategory;
};

/**
 * Single source of truth for transaction modules shown on the dashboard.
 * Add a route folder under app/transactions, then register its label and
 * category here; the matching dashboard section renders it automatically.
 */
export const transactionModules: readonly TransactionModule[] = [
  { slug: "customers", label: "Customers", category: "operational" },
  {
    slug: "service-applications",
    label: "Service applications",
    category: "operational",
  },
  {
    slug: "service-accounts",
    label: "Service accounts",
    category: "operational",
  },
  { slug: "meters", label: "Meters", category: "operational" },
  {
    slug: "meter-installations",
    label: "Meter installations",
    category: "operational",
  },
  {
    slug: "meter-readings",
    label: "Meter readings",
    category: "operational",
  },
  { slug: "bills", label: "Bills", category: "billing" },
  { slug: "bill-details", label: "Bill details", category: "billing" },
] as const;

export function transactionsByCategory(category: TransactionCategory) {
  return transactionModules.filter((item) => item.category === category);
}

export function transactionHref(transaction: TransactionModule) {
  return `/transactions/${transaction.slug}`;
}
