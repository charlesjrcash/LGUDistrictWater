import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hashSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export type SessionUser = {
  userId: string;
  username: string;
  name: string;
  roles: string[];
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const result = await db.query<{
    user_id: string;
    username: string;
    name: string;
    roles: string[] | null;
  }>(
    `SELECT u.user_id,
            u.username,
            concat_ws(' ', u.first_name, u.middle_name, u.last_name) AS name,
            array_remove(array_agg(DISTINCT r.role_name), NULL) AS roles
       FROM user_sessions s
       JOIN users u ON u.user_id = s.user_id
       LEFT JOIN user_roles ur ON ur.user_id = u.user_id
       LEFT JOIN roles r ON r.role_id = ur.role_id AND r.is_active = TRUE
      WHERE s.token_hash = $1
        AND s.expires_at > NOW()
        AND u.is_active = TRUE
      GROUP BY u.user_id, u.username, u.first_name, u.middle_name, u.last_name
      LIMIT 1`,
    [hashSessionToken(token)],
  );

  const user = result.rows[0];
  return user
    ? {
        userId: user.user_id,
        username: user.username,
        name: user.name,
        roles: user.roles ?? [],
      }
    : null;
}

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) {
    return {
      user: null,
      response: Response.json(
        {
          success: false,
          message: "Your session has expired. Please sign in again.",
        },
        { status: 401 },
      ),
    } as const;
  }
  return { user, response: null } as const;
}
