import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUserPermissions } from "@/lib/permissions";
import {
  AdminDashboard,
  type DashboardData,
} from "@/modules/dashboard/ui/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const auth = await getCurrentUserPermissions();
  if (auth.response) redirect("/login?next=/dashboard");
  if (!auth.permissions.includes("DASHBOARD_VIEW")) redirect("/");
  const user = auth.user;

  const [metricsResult, masterResult, auditResult, reportResult] =
    await Promise.all([
      db.query<Record<string, string>>(`SELECT
      (SELECT COUNT(*) FROM users WHERE is_active=TRUE)::text AS active_users,
      (SELECT COUNT(*) FROM users)::text AS total_users,
      (SELECT COUNT(*) FROM mt_employee WHERE is_active=TRUE)::text AS active_employees,
      (SELECT COUNT(*) FROM service_accounts)::text AS service_accounts,
      (SELECT COUNT(*) FROM audit_logs WHERE created_at::date=CURRENT_DATE)::text AS activities_today,
      (SELECT COUNT(*) FROM customers)::text AS customers,
      (SELECT COUNT(*) FROM service_applications)::text AS applications,
      (SELECT COUNT(*) FROM service_applications a JOIN mt_application_status s ON s.application_status_id=a.application_status_id WHERE s.status_code NOT IN ('APPROVED','REJECTED','CANCELLED','COMPLETED'))::text AS pending_applications,
      (SELECT COUNT(*) FROM meters)::text AS meters,
      (SELECT COUNT(*) FROM meters WHERE status='ACTIVE')::text AS active_meters,
      (SELECT COUNT(*) FROM meter_readings)::text AS meter_readings,
      (SELECT COUNT(*) FROM service_installations)::text AS installations,
      (SELECT COUNT(*) FROM disconnection_orders WHERE status='PENDING')::text AS pending_disconnections,
      (SELECT COUNT(*) FROM reconnection_orders WHERE status='PENDING')::text AS pending_reconnections,
      (SELECT COUNT(*) FROM bills)::text AS bills_generated,
      (SELECT COUNT(*) FROM bills WHERE status='UNPAID')::text AS unpaid_bills,
      (SELECT COUNT(*) FROM payments WHERE payment_date::date=CURRENT_DATE AND status='POSTED')::text AS payments_today,
      COALESCE((SELECT SUM(amount) FROM payments WHERE payment_date::date=CURRENT_DATE AND status='POSTED'),0)::text AS collected_today,
      (SELECT COUNT(*) FROM roles)::text AS roles,
      (SELECT COUNT(*) FROM mt_permission)::text AS permissions,
      (SELECT COUNT(*) FROM mt_system_module)::text AS modules,
      (SELECT COUNT(*) FROM mt_billing_period WHERE status='OPEN')::text AS open_periods,
      (SELECT COUNT(*) FROM mt_water_rates WHERE is_active=TRUE AND effective_date<=CURRENT_DATE AND (expiration_date IS NULL OR expiration_date>=CURRENT_DATE))::text AS active_rates,
      (SELECT COUNT(*) FROM mt_fees WHERE is_active=TRUE AND effective_date<=CURRENT_DATE AND (expiration_date IS NULL OR expiration_date>=CURRENT_DATE))::text AS active_fees,
      (SELECT COUNT(*) FROM mt_penalty_rates WHERE is_active=TRUE AND effective_date<=CURRENT_DATE AND (expiration_date IS NULL OR expiration_date>=CURRENT_DATE))::text AS active_penalties,
      (SELECT COUNT(*) FROM mt_reading_route WHERE is_active=TRUE)::text AS active_routes,
      (SELECT COUNT(*) FROM mt_document_series WHERE is_active=TRUE)::text AS active_series,
      (SELECT COUNT(*) FROM mt_system_settings WHERE is_active=TRUE)::text AS active_settings,
      (SELECT COUNT(*) FROM mt_water_rates WHERE is_active=TRUE AND expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE+30)::text AS expiring_rates,
      (SELECT COUNT(*) FROM mt_reading_route WHERE is_active=TRUE AND barangay_id IS NULL)::text AS routes_without_barangays,
      (SELECT COUNT(*) FROM users WHERE is_active=TRUE AND must_change_password=TRUE)::text AS temporary_passwords`),
      db.query<{
        category: string;
        label: string;
        count: string;
        href: string;
      }>(`SELECT * FROM (VALUES
      ('Location','Barangays',(SELECT COUNT(*)::text FROM mt_barangay),'/maintenance/barangays'),
      ('Location','Puroks',(SELECT COUNT(*)::text FROM mt_purok),'/maintenance/puroks'),
      ('Location','Reading Routes',(SELECT COUNT(*)::text FROM mt_reading_route),'/maintenance/reading-routes'),
      ('Customer Configuration','Classifications',(SELECT COUNT(*)::text FROM mt_customer_classification),'/maintenance/customer-classifications'),
      ('Customer Configuration','Application Types',(SELECT COUNT(*)::text FROM mt_application_type),'/maintenance/application-types'),
      ('Customer Configuration','Application Statuses',(SELECT COUNT(*)::text FROM mt_application_status),'/maintenance/application-statuses'),
      ('Water Service','Connection Types',(SELECT COUNT(*)::text FROM mt_connection_type),'/maintenance/connection-types'),
      ('Water Service','Connection Statuses',(SELECT COUNT(*)::text FROM mt_connection_status),'/maintenance/connection-statuses'),
      ('Water Service','Service Types',(SELECT COUNT(*)::text FROM mt_service_type),'/maintenance/service-types'),
      ('Meter','Meter Sizes',(SELECT COUNT(*)::text FROM mt_meter_size),'/maintenance/meter-sizes'),
      ('Meter','Meter Types',(SELECT COUNT(*)::text FROM mt_meter_type),'/maintenance/meter-types'),
      ('Meter','Meter Brands',(SELECT COUNT(*)::text FROM mt_meter_brand),'/maintenance/meter-brands'),
      ('Meter','Reading Statuses',(SELECT COUNT(*)::text FROM mt_reading_status),'/maintenance/reading-statuses'),
      ('Billing','Water Rates',(SELECT COUNT(*)::text FROM mt_water_rates),'/maintenance/water-rates'),
      ('Billing','Fees',(SELECT COUNT(*)::text FROM mt_fees),'/maintenance/fees'),
      ('Billing','Penalty Rates',(SELECT COUNT(*)::text FROM mt_penalty_rates),'/maintenance/penalty-rates'),
      ('Billing','Billing Cycles',(SELECT COUNT(*)::text FROM mt_billing_cycle),'/maintenance/billing-cycles'),
      ('Billing','Billing Periods',(SELECT COUNT(*)::text FROM mt_billing_period),'/maintenance/billing-periods'),
      ('Billing','Due Date Rules',(SELECT COUNT(*)::text FROM mt_due_date_rule),'/maintenance/due-date-rules'),
      ('Engineering','Materials',(SELECT COUNT(*)::text FROM mt_material),'/maintenance/materials'),
      ('Engineering','Units',(SELECT COUNT(*)::text FROM mt_unit_of_measure),'/maintenance/units'),
      ('Disconnection','Reasons',(SELECT COUNT(*)::text FROM mt_disconnection_reason),'/maintenance/disconnection-reasons'),
      ('Disconnection','Orders',(SELECT COUNT(*)::text FROM disconnection_orders),'/transactions/disconnection-orders'),
      ('Reconnection','Orders',(SELECT COUNT(*)::text FROM reconnection_orders),'/transactions/reconnection-orders'),
      ('Collection','Payment Methods',(SELECT COUNT(*)::text FROM mt_payment_method),'/maintenance/payment-methods'),
      ('Collection','Payment Types',(SELECT COUNT(*)::text FROM mt_payment_type),'/maintenance/payment-types'),
      ('Collection','Receipt Types',(SELECT COUNT(*)::text FROM mt_receipt_type),'/maintenance/receipt-types'),
      ('Personnel','Employees',(SELECT COUNT(*)::text FROM mt_employee),'/maintenance/employees'),
      ('Personnel','Meter Readers',(SELECT COUNT(*)::text FROM mt_meter_reader),'/maintenance/meter-readers')
    ) AS data(category,label,count,href)`),
      db.query<{
        id: string;
        action: string;
        description: string | null;
        username: string | null;
        created_at: Date;
      }>(
        `SELECT a.audit_id::text AS id,a.action,a.description,u.username,a.created_at FROM audit_logs a LEFT JOIN users u ON u.user_id=a.user_id ORDER BY a.created_at DESC LIMIT 10`,
      ),
      db.query<{
        report_date: Date;
        collections: string;
        bills: string;
        applications: string;
      }>(`SELECT day AS report_date,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.payment_date::date=day::date AND p.status='POSTED'),0)::text AS collections,
      (SELECT COUNT(*) FROM bills b WHERE b.created_at::date=day::date)::text AS bills,
      (SELECT COUNT(*) FROM service_applications a WHERE a.created_at::date=day::date)::text AS applications
      FROM generate_series(CURRENT_DATE-6,CURRENT_DATE,INTERVAL '1 day') day ORDER BY day`),
    ]);

  const raw = metricsResult.rows[0];
  const number = (key: string) => Number(raw[key] ?? 0);
  const data: DashboardData = {
    userName: user.name || user.username,
    metrics: Object.fromEntries(
      Object.keys(raw).map((key) => [key, number(key)]),
    ),
    masterData: masterResult.rows.map((item) => ({
      ...item,
      count: Number(item.count),
    })),
    activity: auditResult.rows.map((item) => ({
      ...item,
      createdAt: item.created_at.toISOString(),
    })),
    report: reportResult.rows.map((item) => ({
      date: item.report_date.toISOString(),
      collections: Number(item.collections),
      bills: Number(item.bills),
      applications: Number(item.applications),
    })),
  };

  return (
    <AdminDashboard
      data={data}
      permissions={auth.permissions}
      systemAdministrator={user.roles.some(
        (role) => role.toLowerCase() === "system administrator",
      )}
    />
  );
}
