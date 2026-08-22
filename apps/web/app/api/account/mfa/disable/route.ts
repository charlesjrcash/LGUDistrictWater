import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { getCurrentUserPermissions } from "@/lib/permissions";

/** Turns off two-factor sign-in after confirming the account's current password. */
export async function POST(request: Request) {
  const auth = await getCurrentUserPermissions();
  if (auth.response) return auth.response;

  const body = await request.json();
  const password = typeof body.password === "string" ? body.password : "";
  if (!password)
    return Response.json(
      { message: "Enter your current password to continue." },
      { status: 400 },
    );

  const userResult = await db.query<{ password_hash: string }>(
    "SELECT password_hash FROM users WHERE user_id = $1",
    [auth.user.userId],
  );
  const passwordHash = userResult.rows[0]?.password_hash;
  if (!passwordHash || !(await verifyPassword(password, passwordHash)))
    return Response.json({ message: "Incorrect password." }, { status: 401 });

  await db.query("UPDATE users SET mfa_enabled = FALSE WHERE user_id = $1", [
    auth.user.userId,
  ]);

  return Response.json({ message: "Two-factor sign-in is now disabled." });
}
