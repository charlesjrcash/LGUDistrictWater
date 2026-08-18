import { db } from "@/lib/db";

export const runtime = "nodejs";
type Context = { params: Promise<{ applicationNo: string }> };

export async function GET(_request: Request, context: Context) {
  const applicationNo = decodeURIComponent((await context.params).applicationNo);
  try {
    const result = await db.query(
      `SELECT json_build_object(
                'applicationNo', sa.application_no, 'applicationType', at.application_type_name,
                'applicationDate', sa.application_date::text, 'status', ast.status_name, 'statusCode', ast.status_code
              ) AS application,
              json_build_object(
                'customerNo', c.customer_no, 'name', c.customer_name, 'address', c.address,
                'barangay', b.barangay_name, 'contactNo', c.contact_no, 'status', c.status
              ) AS customer,
              acc.control_no AS "existingControlNo"
         FROM service_applications sa
         JOIN customers c ON c.customer_id = sa.customer_id
         LEFT JOIN mt_barangay b ON b.barangay_id = c.barangay_id
         JOIN mt_application_type at ON at.application_type_id = sa.application_type_id
         JOIN mt_application_status ast ON ast.application_status_id = sa.application_status_id
         LEFT JOIN service_accounts acc ON acc.application_id = sa.application_id
        WHERE sa.application_no = $1
        LIMIT 1`,
      [applicationNo],
    );
    if (!result.rows[0]) return Response.json({ success: false, message: "Service application not found." }, { status: 404 });
    return Response.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Unable to load approved application context:", error);
    return Response.json({ success: false, message: "Unable to load the approved application." }, { status: 500 });
  }
}
