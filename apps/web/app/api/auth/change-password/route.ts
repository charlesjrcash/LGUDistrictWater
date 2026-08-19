import { cookies } from "next/headers";
import { Pool } from "pg";
import { hashPassword, hashSessionToken, PASSWORD_RESET_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/auth";

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
    const resetToken = cookieStore.get(PASSWORD_RESET_COOKIE_NAME)?.value;
    if (!sessionToken && !resetToken) return Response.json({ message: "Your password-change session has expired. Start again." }, { status: 401 });

    // Keep the session lookup and password update on one client so the transaction
    // cannot be split across connections in the shared pool.
    const client = await pool.connect();
    let transactionStarted = false;
    try {
      const sessionResult = sessionToken
        ? await client.query<{ user_id: string }>("SELECT user_id FROM user_sessions WHERE token_hash = $1 AND expires_at > NOW()", [hashSessionToken(sessionToken)])
        : { rows: [] as { user_id: string }[] };
      const resetResult = !sessionResult.rows[0] && resetToken
        ? await client.query<{ reset_id: string; user_id: string }>("SELECT reset_id, user_id FROM password_reset_codes WHERE token_hash = $1 AND verified_at IS NOT NULL AND consumed_at IS NULL AND expires_at > NOW()", [hashSessionToken(resetToken)])
        : { rows: [] as { reset_id: string; user_id: string }[] };
      const userId = sessionResult.rows[0]?.user_id ?? resetResult.rows[0]?.user_id;
      if (!userId) return Response.json({ message: "Your password-change session has expired. Start again." }, { status: 401 });

      await client.query("BEGIN");
      transactionStarted = true;
      await client.query("UPDATE users SET password_hash = $1, must_change_password = false, temporary_password_expires_at = NULL, updated_at = NOW() WHERE user_id = $2", [await hashPassword(password), userId]);
      await client.query("DELETE FROM user_sessions WHERE user_id = $1", [userId]);
      await client.query("UPDATE password_reset_codes SET consumed_at = NOW() WHERE user_id = $1 AND consumed_at IS NULL", [userId]);
      await client.query("COMMIT");
      transactionStarted = false;
    } catch (error) {
      if (transactionStarted) await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete(PASSWORD_RESET_COOKIE_NAME);
    return Response.json({ message: "Password updated. Sign in with your new password." });
  } catch (error) {
    console.error("Password change failed:", error);
    return Response.json({ message: "Unable to update your password. Please try again." }, { status: 500 });
  }
}
