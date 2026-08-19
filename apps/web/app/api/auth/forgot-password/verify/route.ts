import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { Pool } from "pg";
import { createSessionToken, hashSessionToken, PASSWORD_RESET_COOKIE_NAME, PASSWORD_RESET_DURATION_SECONDS } from "@/lib/auth";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as { userPool?: Pool };
const pool = globalForDb.userPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForDb.userPool = pool;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!/^\d{6}$/.test(code)) return Response.json({ message: "Enter the six-digit verification code." }, { status: 400 });

    const codeHash = createHash("sha256").update(code).digest("hex");
    const result = await pool.query<{ reset_id: string; code_hash: string }>(
      `UPDATE password_reset_codes r
       SET attempts = attempts + 1
       FROM users u
       WHERE r.user_id = u.user_id
         AND LOWER(u.email) = $1
         AND r.reset_id = (
           SELECT r2.reset_id FROM password_reset_codes r2
           WHERE r2.user_id = u.user_id AND r2.consumed_at IS NULL
           ORDER BY r2.created_at DESC LIMIT 1
         )
         AND r.expires_at > NOW() AND r.verified_at IS NULL AND r.attempts < 5
       RETURNING r.reset_id, r.code_hash`,
      [email],
    );
    const reset = result.rows[0];
    if (!reset || !timingSafeEqual(Buffer.from(reset.code_hash, "hex"), Buffer.from(codeHash, "hex"))) return Response.json({ message: "The verification code is invalid or expired." }, { status: 400 });

    const token = createSessionToken();
    await pool.query("UPDATE password_reset_codes SET verified_at = NOW(), token_hash = $1 WHERE reset_id = $2", [hashSessionToken(token), reset.reset_id]);
    const cookieStore = await cookies();
    cookieStore.set(PASSWORD_RESET_COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: PASSWORD_RESET_DURATION_SECONDS });
    return Response.json({ message: "Code verified. You can now create a new password." });
  } catch (error) {
    console.error("Password reset verification failed:", error);
    return Response.json({ message: "Unable to verify the code. Please try again." }, { status: 500 });
  }
}
