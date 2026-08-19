import { cookies } from "next/headers";
import { Pool } from "pg";
import {
  createSessionToken,
  hashSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  verifyPassword,
} from "@/lib/auth";

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
    }>(
      "SELECT user_id, password_hash, is_active, must_change_password, temporary_password_expires_at FROM users WHERE username = $1",
      [username],
    );
    const user = userResult.rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash)))
      return Response.json(
        { message: "Invalid username or password." },
        { status: 401 },
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
    const roleResult = await pool.query<{ role_name: string }>(
      "SELECT r.role_name FROM user_roles ur INNER JOIN roles r ON r.role_id = ur.role_id WHERE ur.user_id = $1 AND r.is_active = TRUE",
      [user.user_id],
    );
    const redirectTo = roleResult.rows.some((role) =>
      role.role_name.toLowerCase().includes("admin"),
    )
      ? "/dashboard"
      : "/";

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
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
