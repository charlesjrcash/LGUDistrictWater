import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/server-session";
export const runtime="nodejs";
export async function GET(){const auth=await requireSessionUser();if(auth.response)return auth.response;try{const r=await db.query("SELECT module_id,module_code,module_name,parent_module_id,sort_order FROM public.mt_system_module WHERE is_active=TRUE ORDER BY sort_order ASC,module_name ASC");return Response.json({success:true,data:r.rows})}catch(error){console.error("Unable to load system modules:",error);return Response.json({success:false,message:"Unable to load system modules."},{status:500})}}
