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

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

/** Rejects cross-site API mutations while leaving same-origin fetches untouched. */
function blockedByCrossSiteOrigin(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) return false;
  if (safeMethods.has(request.method)) return false;

  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).host !== request.headers.get("host");
  } catch {
    return true;
  }
}

export function proxy(request: NextRequest) {
  if (blockedByCrossSiteOrigin(request))
    return NextResponse.json(
      { message: "Cross-site request blocked." },
      { status: 403 },
    );

  const legacyTransactionPrefixes: Record<string, string> = {
    "/bills": "/transactions/bills",
    "/meters": "/transactions/meters",
    "/meter-installations": "/transactions/meter-installations",
    "/meter-readings": "/transactions/meter-readings",
  };
  const legacyTransactionRoute = Object.entries(legacyTransactionPrefixes).find(
    ([source]) =>
      request.nextUrl.pathname === source ||
      request.nextUrl.pathname.startsWith(`${source}/`),
  );

  let response: NextResponse;

  if (legacyTransactionRoute) {
    const [source, destination] = legacyTransactionRoute;
    const url = request.nextUrl.clone();
    url.pathname = `${destination}${request.nextUrl.pathname.slice(source.length)}`;
    response = NextResponse.redirect(url, 308);
  } else {
    const destination = legacyMaintenanceRoutes[request.nextUrl.pathname];
    response = destination
      ? NextResponse.redirect(new URL(destination, request.url), 308)
      : NextResponse.next();
  }

  // Prevents the browser's back-forward cache from repainting a stale,
  // already-authenticated page after logout or on a shared device — see
  // the back/forward navigation report investigated on 2026-08-22.
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate",
  );

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
