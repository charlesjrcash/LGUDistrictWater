import { db } from "@/lib/db";
import { requireAnyPermission } from "@/lib/permissions";

export const runtime = "nodejs";
export async function GET() {
  const auth = await requireAnyPermission(["CUSTOMER_CREATE", "CUSTOMER_EDIT"]); if (auth.response) return auth.response;
  try {
    const [barangays, puroks] = await Promise.all([
      db.query(`SELECT barangay_code AS code, barangay_name AS name FROM mt_barangay WHERE is_active=TRUE ORDER BY barangay_name`),
      db.query(`SELECT COALESCE(p.purok_code,p.purok_name) AS code, p.purok_name AS name, b.barangay_code AS "barangayCode" FROM mt_purok p JOIN mt_barangay b ON b.barangay_id=p.barangay_id WHERE p.is_active=TRUE ORDER BY b.barangay_name,p.purok_name`),
    ]);
    return Response.json({ success: true, data: { barangays: barangays.rows, puroks: puroks.rows } });
  } catch (error) { console.error("Unable to load customer options:", error); return Response.json({ success:false,message:"Unable to load customer options."},{status:500}); }
}
