import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  hashSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_IDLE_TIMEOUT_SECONDS,
} from "@/lib/auth";

export type SessionUser = {
  userId: string;
  username: string;
  name: string;
  roles: string[];
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
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
        AND s.last_seen_at > NOW() - $2 * INTERVAL '1 second'
        AND u.is_active = TRUE
      GROUP BY u.user_id, u.username, u.first_name, u.middle_name, u.last_name
      LIMIT 1`,
    [tokenHash, SESSION_IDLE_TIMEOUT_SECONDS],
  );

  const user = result.rows[0];
  if (!user) return null;

  // Slides the idle window forward; throttled so an active user's every
  // request doesn't write to the session row.
  db.query(
    `UPDATE user_sessions SET last_seen_at = NOW()
      WHERE token_hash = $1 AND last_seen_at < NOW() - INTERVAL '60 seconds'`,
    [tokenHash],
  ).catch((error) => {
    console.error("Failed to refresh session activity:", error);
  });

  return {
    userId: user.user_id,
    username: user.username,
    name: user.name,
    roles: user.roles ?? [],
  };
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
