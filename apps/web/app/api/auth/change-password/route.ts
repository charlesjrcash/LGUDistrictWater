import { cookies } from "next/headers";
import { Pool } from "pg";
import { hashPassword, hashSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as { userPool?: Pool };
const pool = globalForDb.userPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForDb.userPool = pool;

/** Replaces an authenticated user's temporary password and revokes all old sessions. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
    if (password.length < 8) return Response.json({ message: "Password must contain at least 8 characters." }, { status: 400 });
    if (password !== confirmPassword) return Response.json({ message: "Passwords do not match." }, { status: 400 });

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) return Response.json({ message: "Your sign-in session has expired. Sign in again." }, { status: 401 });

    // Keep the session lookup and password update on one client so the transaction
    // cannot be split across connections in the shared pool.
    const client = await pool.connect();
    try {
      const sessionResult = await client.query<{ user_id: string }>("SELECT user_id FROM user_sessions WHERE token_hash = $1 AND expires_at > NOW()", [hashSessionToken(sessionToken)]);
      const session = sessionResult.rows[0];
      if (!session) return Response.json({ message: "Your sign-in session has expired. Sign in again." }, { status: 401 });

      await client.query("BEGIN");
      await client.query("UPDATE users SET password_hash = $1, must_change_password = false, temporary_password_expires_at = NULL, updated_at = NOW() WHERE user_id = $2", [await hashPassword(password), session.user_id]);
      await client.query("DELETE FROM user_sessions WHERE user_id = $1", [session.user_id]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    cookieStore.delete(SESSION_COOKIE_NAME);
    return Response.json({ message: "Password updated. Sign in with your new password." });
  } catch (error) {
    console.error("Password change failed:", error);
    return Response.json({ message: "Unable to update your password. Please try again." }, { status: 500 });
  }
}
