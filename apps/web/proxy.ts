import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const legacyMaintenanceRoutes: Record<string, string> = {
  "/maintenance/ApplicationStatuses": "/maintenance/application-statuses",
  "/maintenance/ApplicationTypes": "/maintenance/application-types",
  "/maintenance/Barangays": "/maintenance/barangays",
  "/maintenance/BillingCycles": "/maintenance/billing-cycles",
  "/maintenance/BillingPeriods": "/maintenance/billing-periods",
  "/maintenance/ConnectionStatuses": "/maintenance/connection-statuses",
  "/maintenance/ConnectionTypes": "/maintenance/connection-types",
  "/maintenance/CustomerClassifications":
    "/maintenance/customer-classifications",
  "/maintenance/DisconnectionReasons": "/maintenance/disconnection-reasons",
  "/maintenance/DueDateRules": "/maintenance/due-date-rules",
  "/maintenance/Employees": "/maintenance/employees",
  "/maintenance/Fees": "/maintenance/fees",
  "/maintenance/Materials": "/maintenance/materials",
  "/maintenance/MeterBrands": "/maintenance/meter-brands",
  "/maintenance/MeterReaders": "/maintenance/meter-readers",
  "/maintenance/MeterSizes": "/maintenance/meter-sizes",
  "/maintenance/MeterTypes": "/maintenance/meter-types",
  "/maintenance/PaymentMethods": "/maintenance/payment-methods",
  "/maintenance/PaymentTypes": "/maintenance/payment-types",
  "/maintenance/PenaltyRates": "/maintenance/penalty-rates",
  "/maintenance/Permissions": "/maintenance/permissions",
  "/maintenance/Puroks": "/maintenance/puroks",
  "/maintenance/ReadingRoutes": "/maintenance/reading-routes",
  "/maintenance/ReadingStatuses": "/maintenance/reading-statuses",
  "/maintenance/ReceiptTypes": "/maintenance/receipt-types",
  "/maintenance/RolePermissions": "/maintenance/role-permissions",
  "/maintenance/Roles": "/maintenance/roles",
  "/maintenance/ServiceTypes": "/maintenance/service-types",
  "/maintenance/SystemModules": "/maintenance/system-modules",
  "/maintenance/SystemSettings": "/maintenance/system-settings",
  "/maintenance/Units": "/maintenance/units",
};

export function proxy(request: NextRequest) {
  const destination = legacyMaintenanceRoutes[request.nextUrl.pathname];

  if (!destination) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(destination, request.url), 308);
}

export const config = {
  matcher: "/maintenance/:path*",
};
