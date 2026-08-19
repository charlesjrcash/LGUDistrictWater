import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hashSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  try {
    if (token)
      await db.query("DELETE FROM user_sessions WHERE token_hash=$1", [
        hashSessionToken(token),
      ]);
  } catch (error) {
    console.error("Logout session cleanup failed:", error);
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
  return Response.json({ message: "Signed out successfully." });
}
