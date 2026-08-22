import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { Pool } from "pg";
import {
  hashSessionToken,
  MFA_PENDING_COOKIE_NAME,
  MFA_PENDING_DURATION_SECONDS,
} from "@/lib/auth";
import { sendMfaCodeEmail } from "@/lib/mailer";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as { userPool?: Pool };
const pool =
  globalForDb.userPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForDb.userPool = pool;

const expiredMessage =
  "Your verification session has expired. Please sign in again.";

/** Sends a fresh sign-in code for the pending MFA challenge, replacing the previous one. */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const pendingToken = cookieStore.get(MFA_PENDING_COOKIE_NAME)?.value;
    if (!pendingToken)
      return Response.json({ message: expiredMessage }, { status: 401 });

    const tokenHash = hashSessionToken(pendingToken);
    const pending = await pool.query<{ user_id: string; created_at: Date }>(
      `SELECT c.user_id, c.created_at
         FROM mfa_codes c
        WHERE c.token_hash = $1 AND c.purpose = 'LOGIN'
          AND c.consumed_at IS NULL AND c.expires_at > NOW()
        LIMIT 1`,
      [tokenHash],
    );
    const row = pending.rows[0];
    if (!row) {
      cookieStore.delete(MFA_PENDING_COOKIE_NAME);
      return Response.json({ message: expiredMessage }, { status: 401 });
    }
    if (row.created_at > new Date(Date.now() - 60_000))
      return Response.json(
        { message: "Please wait a moment before requesting another code." },
        { status: 429 },
      );

    const userResult = await pool.query<{ email: string | null }>(
      "SELECT email FROM users WHERE user_id = $1",
      [row.user_id],
    );
    const email = userResult.rows[0]?.email;
    if (!email)
      return Response.json({ message: expiredMessage }, { status: 401 });

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const expiresAt = new Date(Date.now() + MFA_PENDING_DURATION_SECONDS * 1000);
    await pool.query(
      `UPDATE mfa_codes SET code_hash = $2, expires_at = $3, attempts = 0, created_at = NOW()
        WHERE token_hash = $1 AND purpose = 'LOGIN' AND consumed_at IS NULL`,
      [tokenHash, hashSessionToken(code), expiresAt],
    );

    await sendMfaCodeEmail({ to: email, code, expiresAt, purpose: "login" });

    return Response.json({ message: "A new verification code has been sent." });
  } catch (error) {
    console.error("MFA code resend failed:", error);
    return Response.json(
      { message: "Unable to send another code. Please try again." },
      { status: 500 },
    );
  }
}
