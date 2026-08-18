import { db } from "@/lib/db";
import { clean } from "@/modules/service-applications/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = clean(new URL(request.url).searchParams.get("q"), 100);
  if (query.length < 2) return Response.json({ success: true, data: [] });

  try {
    const result = await db.query(
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
    );
    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Unable to search customers:", error);
    return Response.json({ success: false, message: "Unable to search customers right now." }, { status: 500 });
  }
}
