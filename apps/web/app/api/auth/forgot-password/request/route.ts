import { createHash, randomInt } from "node:crypto";
import { Pool } from "pg";
import { sendPasswordResetCodeEmail } from "@/lib/mailer";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as { userPool?: Pool };
const pool =
  globalForDb.userPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForDb.userPool = pool;

const genericMessage =
  "If an active account uses that email, a verification code has been sent.";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return Response.json(
        { message: "Enter a valid email address." },
        { status: 400 },
      );

    const result = await pool.query<{ user_id: string; email: string }>(
      "SELECT user_id, email FROM users WHERE LOWER(email) = $1 AND is_active = TRUE LIMIT 1",
      [email],
    );
    const user = result.rows[0];
    if (!user) return Response.json({ message: genericMessage });

    const recent = await pool.query(
      "SELECT 1 FROM password_reset_codes WHERE user_id = $1 AND created_at > NOW() - INTERVAL '60 seconds' LIMIT 1",
      [user.user_id],
    );
    if (recent.rowCount) return Response.json({ message: genericMessage });

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const codeHash = createHash("sha256").update(code).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const inserted = await pool.query<{ reset_id: string }>(
      "INSERT INTO password_reset_codes (user_id, code_hash, expires_at) VALUES ($1, $2, $3) RETURNING reset_id",
      [user.user_id, codeHash, expiresAt],
    );

    try {
      await sendPasswordResetCodeEmail({ to: user.email, code, expiresAt });
    } catch (error) {
      await pool.query("DELETE FROM password_reset_codes WHERE reset_id = $1", [
        inserted.rows[0].reset_id,
      ]);
      console.error("Password reset email failed:", error);
    }

    return Response.json({ message: genericMessage });
  } catch (error) {
    console.error("Password reset request failed:", error);
    return Response.json(
      { message: "Unable to process the request. Please try again." },
      { status: 500 },
    );
  }
}
