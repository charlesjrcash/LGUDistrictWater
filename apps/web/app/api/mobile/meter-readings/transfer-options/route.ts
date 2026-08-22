import { db } from "@/lib/db";
import { fail, id, mobileDatabaseError } from "@/lib/mobile-meter-readings";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requirePermission("METER_READING_VIEW");
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const billingPeriodId = id(params.get("billingPeriodId"));
  const meterReaderId = id(params.get("meterReaderId"));
  try {
    if (!billingPeriodId || !meterReaderId) {
      const [periods, readers] = await Promise.all([
        db.query(`SELECT billing_period_id::text AS "billingPeriodId", period_code AS "periodCode", COALESCE(period_name, period_code) AS "periodName", start_date::text AS "startDate", end_date::text AS "endDate", status FROM mt_billing_period ORDER BY CASE WHEN UPPER(status) = 'OPEN' THEN 0 ELSE 1 END, start_date DESC`),
        db.query(`SELECT mr.meter_reader_id::text AS "meterReaderId", mr.employee_id::text AS "employeeId", e.employee_code AS "employeeCode", e.employee_name AS "employeeName" FROM mt_meter_reader mr INNER JOIN mt_employee e ON e.employee_id = mr.employee_id WHERE mr.is_active = TRUE AND e.is_active = TRUE ORDER BY e.employee_name`),
      ]);
      return Response.json({ success: true, data: { periods: periods.rows, meterReaders: readers.rows, routes: [] } });
    }
    const routes = await db.query(
      `SELECT r.route_id::text AS "routeId", r.route_code AS "routeCode", r.route_name AS "routeName",
              COUNT(rd.reading_id) FILTER (WHERE workflow.status_code = 'FOR_READ')::int AS "forReadCount",
              COUNT(rd.reading_id) FILTER (WHERE workflow.status_code = 'IN_PROGRESS')::int AS "inProgressCount",
              COUNT(rd.reading_id) FILTER (WHERE workflow.status_code = 'COMPLETED')::int AS "completedCount",
              COUNT(rd.reading_id) FILTER (WHERE workflow.status_code = 'VALIDATED')::int AS "validatedCount"
         FROM mt_reading_route r
         INNER JOIN mt_meter_reader mr ON mr.employee_id = r.employee_id
         LEFT JOIN service_accounts sa ON sa.route_id = r.route_id
         LEFT JOIN meter_readings rd ON rd.service_account_id = sa.service_account_id AND rd.billing_period_id = $1
         LEFT JOIN mt_reading_workflow_status workflow ON workflow.reading_workflow_status_id = rd.reading_workflow_status_id
        WHERE mr.meter_reader_id = $2 AND r.is_active = TRUE AND mr.is_active = TRUE
        GROUP BY r.route_id, r.route_code, r.route_name, r.sequence_no
        ORDER BY r.sequence_no NULLS LAST, r.route_code`,
      [billingPeriodId, meterReaderId],
    );
    return Response.json({ success: true, data: { periods: [], meterReaders: [], routes: routes.rows } });
  } catch (error) {
    console.error("Unable to load mobile transfer options:", error);
    return fail(mobileDatabaseError(error, "Unable to load mobile transfer options."), 500);
  }
}
