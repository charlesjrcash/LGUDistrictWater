import { db } from "@/lib/db";
import { requireSessionUser, type SessionUser } from "@/lib/server-session";

export type CurrentUserPermissions = {
  user: SessionUser | null;
  permissions: string[];
  response: Response | null;
};

type PermissionRow = {
  permission_code: string;
};

function forbiddenResponse() {
  return Response.json(
    {
      success: false,
      message: "You do not have permission to perform this action.",
    },
    { status: 403 },
  );
}

function permissionsErrorResponse() {
  return Response.json(
    {
      success: false,
      message: "Unable to verify your permissions. Please try again.",
    },
    { status: 500 },
  );
}

/** Returns the authenticated user's effective, active permission codes. */
export async function getCurrentUserPermissions(): Promise<CurrentUserPermissions> {
  const auth = await requireSessionUser();
  if (auth.response) {
    return { user: null, permissions: [], response: auth.response };
  }

  try {
    const result = await db.query<PermissionRow>(
      `SELECT DISTINCT p.permission_code
         FROM public.users u
         INNER JOIN public.user_roles ur ON ur.user_id = u.user_id
         INNER JOIN public.roles r ON r.role_id = ur.role_id
         INNER JOIN public.mt_role_permission rp ON rp.role_id = r.role_id
         INNER JOIN public.mt_permission p ON p.permission_id = rp.permission_id
        WHERE u.user_id = $1
          AND r.is_active = TRUE
          AND p.is_active = TRUE
        ORDER BY p.permission_code`,
      [auth.user.userId],
    );

    return {
      user: auth.user,
      permissions: result.rows.map((row) => row.permission_code),
      response: null,
    };
  } catch (error) {
    console.error("Unable to load current user permissions:", error);
    return { user: auth.user, permissions: [], response: permissionsErrorResponse() };
  }
}

/** Checks one permission entirely on the server. Authentication or query failures return false. */
export async function hasPermission(permissionCode: string): Promise<boolean> {
  const requestedPermission = permissionCode.trim();
  if (!requestedPermission) return false;

  const auth = await getCurrentUserPermissions();
  return !auth.response && auth.permissions.includes(requestedPermission);
}

/**
 * Produces the same shape as requireSessionUser(), with a 403 response for an
 * authenticated user who lacks the requested permission.
 */
export async function requirePermission(permissionCode: string): Promise<CurrentUserPermissions> {
  const auth = await getCurrentUserPermissions();
  if (auth.response) return auth;

  return auth.permissions.includes(permissionCode.trim())
    ? auth
    : { user: auth.user, permissions: auth.permissions, response: forbiddenResponse() };
}
