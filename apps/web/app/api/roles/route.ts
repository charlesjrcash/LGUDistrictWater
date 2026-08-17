import { getActiveRoles } from "@/lib/roles";

export const runtime = "nodejs";

/**
 * Returns active roles for the registration form. Roles are managed in PostgreSQL,
 * so changing the roles table automatically updates the next form load.
 */
export async function GET() {
  try {
    return Response.json({ roles: await getActiveRoles() });
  } catch (error) {
    console.error("Unable to load roles:", error);
    return Response.json({ message: "Unable to load system roles." }, { status: 500 });
  }
}
