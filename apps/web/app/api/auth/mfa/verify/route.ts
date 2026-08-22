import { cookies } from "next/headers";
import { Pool } from "pg";
import {
  createSessionToken,
  hashSessionToken,
  isSecureRequest,
  MAX_MFA_CODE_ATTEMPTS,
  MFA_PENDING_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "@/lib/auth";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as { userPool?: Pool };
const pool =
  globalForDb.userPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForDb.userPool = pool;

const expiredMessage =
  "Your verification code has expired. Please sign in again.";

/** Verifies the emailed sign-in code and completes login by creating the real session. */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const pendingToken = cookieStore.get(MFA_PENDING_COOKIE_NAME)?.value;
    if (!pendingToken)
      return Response.json({ message: expiredMessage }, { status: 401 });

    const body = await request.json();
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!/^\d{6}$/.test(code))
      return Response.json(
        { message: "Enter the 6-digit code." },
        { status: 400 },
      );

    const tokenHash = hashSessionToken(pendingToken);
    const pending = await pool.query<{
      mfa_code_id: string;
      user_id: string;
      code_hash: string;
      attempts: number;
    }>(
      `SELECT mfa_code_id, user_id, code_hash, attempts
         FROM mfa_codes
        WHERE token_hash = $1 AND purpose = 'LOGIN'
          AND consumed_at IS NULL AND expires_at > NOW()
        LIMIT 1`,
      [tokenHash],
    );
    const row = pending.rows[0];
    if (!row) {
      cookieStore.delete(MFA_PENDING_COOKIE_NAME);
      return Response.json({ message: expiredMessage }, { status: 401 });
    }
    if (row.attempts >= MAX_MFA_CODE_ATTEMPTS) {
      await pool.query("DELETE FROM mfa_codes WHERE mfa_code_id = $1", [
        row.mfa_code_id,
      ]);
      cookieStore.delete(MFA_PENDING_COOKIE_NAME);
      return Response.json(
        { message: "Too many attempts. Please sign in again." },
        { status: 401 },
      );
    }

    if (hashSessionToken(code) !== row.code_hash) {
      const updated = await pool.query<{ attempts: number }>(
        "UPDATE mfa_codes SET attempts = attempts + 1 WHERE mfa_code_id = $1 RETURNING attempts",
        [row.mfa_code_id],
      );
      const remaining = Math.max(
        0,
        MAX_MFA_CODE_ATTEMPTS - updated.rows[0].attempts,
      );
      return Response.json(
        {
          message: remaining
            ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
            : "Too many attempts. Please sign in again.",
        },
        { status: 401 },
      );
    }

    const userResult = await pool.query<{
      user_id: string;
      must_change_password: boolean;
      is_active: boolean;
    }>(
      "SELECT user_id, must_change_password, is_active FROM users WHERE user_id = $1",
      [row.user_id],
    );
    const user = userResult.rows[0];
    if (!user || !user.is_active) {
      await pool.query("DELETE FROM mfa_codes WHERE mfa_code_id = $1", [
        row.mfa_code_id,
      ]);
      cookieStore.delete(MFA_PENDING_COOKIE_NAME);
      return Response.json(
        { message: "This account is inactive. Contact an administrator." },
        { status: 403 },
      );
    }

    await pool.query("UPDATE mfa_codes SET consumed_at = NOW() WHERE mfa_code_id = $1", [
      row.mfa_code_id,
    ]);
    cookieStore.delete(MFA_PENDING_COOKIE_NAME);

    const sessionToken = createSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
    await pool.query(
      "INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
      [user.user_id, hashSessionToken(sessionToken), expiresAt],
    );
    await pool.query("UPDATE users SET last_login_at = NOW() WHERE user_id = $1", [
      user.user_id,
    ]);

    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });
    return Response.json({
      message: user.must_change_password
        ? "Temporary password accepted. Create a new password to continue."
        : "Signed in successfully.",
      mustChangePassword: user.must_change_password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    console.error("MFA verification failed:", error);
    return Response.json(
      { message: "Unable to verify your code. Please try again." },
      { status: 500 },
    );
  }
}
