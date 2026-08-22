import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { Pool } from "pg";
import {
  createSessionToken,
  hashSessionToken,
  isSecureRequest,
  LOCKOUT_DURATION_SECONDS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  MFA_PENDING_COOKIE_NAME,
  MFA_PENDING_DURATION_SECONDS,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  verifyPassword,
} from "@/lib/auth";
import { sendMfaCodeEmail } from "@/lib/mailer";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as { userPool?: Pool };
const pool =
  globalForDb.userPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForDb.userPool = pool;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/** Verifies login credentials and creates an HTTP-only server session. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = clean(body.username);
    const password = typeof body.password === "string" ? body.password : "";
    if (!username || !password)
      return Response.json(
        { message: "Enter your username and password." },
        { status: 400 },
      );

    const userResult = await pool.query<{
      user_id: string;
      password_hash: string;
      is_active: boolean;
      must_change_password: boolean;
      temporary_password_expires_at: Date | null;
      failed_login_attempts: number;
      locked_until: Date | null;
      mfa_enabled: boolean;
      email: string | null;
    }>(
      "SELECT user_id, password_hash, is_active, must_change_password, temporary_password_expires_at, failed_login_attempts, locked_until, mfa_enabled, email FROM users WHERE username = $1",
      [username],
    );
    const user = userResult.rows[0];
    if (!user)
      return Response.json(
        { message: "Invalid username or password." },
        { status: 401 },
      );

    if (user.locked_until && user.locked_until > new Date())
      return Response.json(
        {
          message: `Too many failed attempts. Try again after ${user.locked_until.toLocaleTimeString(
            "en-PH",
            { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila" },
          )}.`,
        },
        { status: 423 },
      );

    if (!(await verifyPassword(password, user.password_hash))) {
      const lockout = await pool.query<{
        failed_login_attempts: number;
        locked_until: Date | null;
      }>(
        `UPDATE users
            SET failed_login_attempts = failed_login_attempts + 1,
                locked_until = CASE WHEN failed_login_attempts + 1 >= $2
                                     THEN NOW() + $3 * INTERVAL '1 second'
                                     ELSE locked_until END
          WHERE user_id = $1
          RETURNING failed_login_attempts, locked_until`,
        [user.user_id, MAX_FAILED_LOGIN_ATTEMPTS, LOCKOUT_DURATION_SECONDS],
      );
      const { locked_until } = lockout.rows[0];
      if (locked_until && locked_until > new Date()) {
        await pool.query(
          `INSERT INTO audit_logs (user_id, action, table_name, record_id, description)
           VALUES ($1, 'LOGIN_LOCKED', 'users', $2, $3)`,
          [
            user.user_id,
            user.user_id,
            `Account locked after ${MAX_FAILED_LOGIN_ATTEMPTS} failed sign-in attempts.`,
          ],
        );
        return Response.json(
          {
            message: `Too many failed attempts. Try again after ${locked_until.toLocaleTimeString(
              "en-PH",
              { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila" },
            )}.`,
          },
          { status: 423 },
        );
      }
      return Response.json(
        { message: "Invalid username or password." },
        { status: 401 },
      );
    }

    if (user.failed_login_attempts > 0 || user.locked_until)
      await pool.query(
        "UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = $1",
        [user.user_id],
      );

    if (!user.is_active)
      return Response.json(
        { message: "This account is inactive. Contact an administrator." },
        { status: 403 },
      );
    if (
      user.must_change_password &&
      (!user.temporary_password_expires_at ||
        user.temporary_password_expires_at <= new Date())
    )
      return Response.json(
        {
          message:
            "Your temporary password has expired. Ask an administrator to reset it.",
        },
        { status: 401 },
      );

    if (user.mfa_enabled) {
      if (!user.email)
        return Response.json(
          {
            message:
              "Two-factor sign-in is enabled but no email is on file. Contact an administrator.",
          },
          { status: 500 },
        );

      const pendingToken = createSessionToken();
      const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
      const expiresAt = new Date(
        Date.now() + MFA_PENDING_DURATION_SECONDS * 1000,
      );
      await pool.query(
        "INSERT INTO mfa_codes (user_id, purpose, code_hash, token_hash, expires_at) VALUES ($1, 'LOGIN', $2, $3, $4)",
        [
          user.user_id,
          hashSessionToken(code),
          hashSessionToken(pendingToken),
          expiresAt,
        ],
      );

      try {
        await sendMfaCodeEmail({
          to: user.email,
          code,
          expiresAt,
          purpose: "login",
        });
      } catch (error) {
        await pool.query(
          "DELETE FROM mfa_codes WHERE token_hash = $1",
          [hashSessionToken(pendingToken)],
        );
        console.error("MFA login code email failed:", error);
        return Response.json(
          { message: "Unable to send your verification code. Please try again." },
          { status: 500 },
        );
      }

      const cookieStore = await cookies();
      cookieStore.set(MFA_PENDING_COOKIE_NAME, pendingToken, {
        httpOnly: true,
        secure: isSecureRequest(request),
        sameSite: "lax",
        path: "/",
        maxAge: MFA_PENDING_DURATION_SECONDS,
      });
      return Response.json({
        mfaRequired: true,
        message: "Enter the 6-digit code sent to your registered email.",
      });
    }

    const sessionToken = createSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
    await pool.query(
      "INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
      [user.user_id, hashSessionToken(sessionToken), expiresAt],
    );
    await pool.query(
      "UPDATE users SET last_login_at = NOW() WHERE user_id = $1",
      [user.user_id],
    );
    // The dashboard performs the permission check. Do not route by role name:
    // users can hold multiple roles and receive DASHBOARD_VIEW from any of them.
    const redirectTo = "/dashboard";

    const cookieStore = await cookies();
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
      redirectTo,
    });
  } catch (error) {
    console.error("Login failed:", error);
    return Response.json(
      { message: "Unable to sign in. Please try again." },
      { status: 500 },
    );
  }
}
