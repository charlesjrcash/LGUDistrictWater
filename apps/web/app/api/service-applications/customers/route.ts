import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { clean } from "@/modules/service-applications/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requirePermission("SERVICE_APPLICATION_CREATE");
  if (auth.response) return auth.response;
  const query = clean(new URL(request.url).searchParams.get("q"), 100);

  try {
    const result =
      query.length >= 2
        ? await db.query(
            `SELECT c.customer_no AS "customerNo", c.customer_name AS name, c.address,
              b.barangay_name AS barangay, c.contact_no AS "contactNo", c.status
         FROM customers c
         LEFT JOIN mt_barangay b ON b.barangay_id = c.barangay_id
        WHERE c.customer_no ILIKE $1
           OR c.customer_name ILIKE $1
           OR COALESCE(c.contact_no, '') ILIKE $1
        ORDER BY CASE WHEN c.customer_no ILIKE $2 THEN 0 ELSE 1 END, c.customer_name
        LIMIT 12`,
            [`%${query}%`, `${query}%`],
          )
        : await db.query(
            `SELECT c.customer_no AS "customerNo", c.customer_name AS name, c.address,
                b.barangay_name AS barangay, c.contact_no AS "contactNo", c.status
           FROM customers c
           LEFT JOIN mt_barangay b ON b.barangay_id = c.barangay_id
          ORDER BY c.created_at DESC, c.customer_name
          LIMIT 12`,
          );
    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Unable to search customers:", error);
    return Response.json(
      { success: false, message: "Unable to search customers right now." },
      { status: 500 },
    );
  }
}
