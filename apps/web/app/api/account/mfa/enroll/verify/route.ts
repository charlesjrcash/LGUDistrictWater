import { db } from "@/lib/db";
import { hashSessionToken, MAX_MFA_CODE_ATTEMPTS } from "@/lib/auth";
import { getCurrentUserPermissions, isMfaEligible } from "@/lib/permissions";

/** Confirms the emailed code and turns on two-factor sign-in for the account. */
export async function POST(request: Request) {
  const auth = await getCurrentUserPermissions();
  if (auth.response) return auth.response;
  if (!isMfaEligible(auth.permissions))
    return Response.json(
      { message: "Two-factor sign-in is not available for this account." },
      { status: 403 },
    );

  const body = await request.json();
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code))
    return Response.json({ message: "Enter the 6-digit code." }, { status: 400 });

  const pending = await db.query<{ mfa_code_id: string; code_hash: string; attempts: number }>(
    `SELECT mfa_code_id, code_hash, attempts
       FROM mfa_codes
      WHERE user_id = $1 AND purpose = 'ENROLL'
        AND consumed_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1`,
    [auth.user.userId],
  );
  const row = pending.rows[0];
  if (!row)
    return Response.json(
      { message: "Your verification code has expired. Request a new one." },
      { status: 401 },
    );
  if (row.attempts >= MAX_MFA_CODE_ATTEMPTS) {
    await db.query("DELETE FROM mfa_codes WHERE mfa_code_id = $1", [row.mfa_code_id]);
    return Response.json(
      { message: "Too many attempts. Request a new code." },
      { status: 401 },
    );
  }

  if (hashSessionToken(code) !== row.code_hash) {
    const updated = await db.query<{ attempts: number }>(
      "UPDATE mfa_codes SET attempts = attempts + 1 WHERE mfa_code_id = $1 RETURNING attempts",
      [row.mfa_code_id],
    );
    const remaining = Math.max(0, MAX_MFA_CODE_ATTEMPTS - updated.rows[0].attempts);
    return Response.json(
      {
        message: remaining
          ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Too many attempts. Request a new code.",
      },
      { status: 401 },
    );
  }

  await db.query("UPDATE mfa_codes SET consumed_at = NOW() WHERE mfa_code_id = $1", [
    row.mfa_code_id,
  ]);
  await db.query("UPDATE users SET mfa_enabled = TRUE WHERE user_id = $1", [
    auth.user.userId,
  ]);

  return Response.json({ message: "Two-factor sign-in is now enabled." });
}
