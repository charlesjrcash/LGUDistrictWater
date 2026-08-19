import { getCurrentUserPermissions } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET() {
  const auth = await getCurrentUserPermissions();
  if (auth.response) return auth.response;

  return Response.json({ success: true, permissions: auth.permissions });
}
