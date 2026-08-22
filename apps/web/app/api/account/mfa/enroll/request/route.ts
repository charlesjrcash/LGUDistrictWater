import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { hashSessionToken, MFA_PENDING_DURATION_SECONDS } from "@/lib/auth";
import { sendMfaCodeEmail } from "@/lib/mailer";
import { getCurrentUserPermissions, isMfaEligible } from "@/lib/permissions";

/** Sends a confirmation code to enable two-factor sign-in for the signed-in user. */
export async function POST() {
  const auth = await getCurrentUserPermissions();
  if (auth.response) return auth.response;
  if (!isMfaEligible(auth.permissions))
    return Response.json(
      { message: "Two-factor sign-in is not available for this account." },
      { status: 403 },
    );

  const emailResult = await db.query<{ email: string | null }>(
    "SELECT email FROM users WHERE user_id = $1",
    [auth.user.userId],
  );
  const email = emailResult.rows[0]?.email;
  if (!email)
    return Response.json(
      {
        message:
          "Add an email address to your account before enabling two-factor sign-in.",
      },
      { status: 400 },
    );

  const recent = await db.query(
    `SELECT 1 FROM mfa_codes
      WHERE user_id = $1 AND purpose = 'ENROLL' AND created_at > NOW() - INTERVAL '60 seconds'
      LIMIT 1`,
    [auth.user.userId],
  );
  if (recent.rowCount)
    return Response.json({
      message: "A code was already sent. Check your email.",
    });

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = new Date(Date.now() + MFA_PENDING_DURATION_SECONDS * 1000);
  await db.query(
    "INSERT INTO mfa_codes (user_id, purpose, code_hash, expires_at) VALUES ($1, 'ENROLL', $2, $3)",
    [auth.user.userId, hashSessionToken(code), expiresAt],
  );

  try {
    await sendMfaCodeEmail({ to: email, code, expiresAt, purpose: "enroll" });
  } catch (error) {
    console.error("MFA enrollment code email failed:", error);
    return Response.json(
      { message: "Unable to send a verification code. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({
    message: `We emailed a verification code to ${email}.`,
  });
}
