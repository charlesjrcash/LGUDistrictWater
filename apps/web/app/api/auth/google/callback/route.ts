import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { Pool } from "pg";
import {
  createSessionToken,
  hashSessionToken,
  isSecureRequest,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "@/lib/auth";
import {
  getGoogleConfig,
  GOOGLE_OAUTH_NONCE_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_VERIFIER_COOKIE,
  loginErrorUrl,
} from "@/lib/google-auth";

export const runtime = "nodejs";
const globalForDb = globalThis as unknown as { userPool?: Pool };
const pool =
  globalForDb.userPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForDb.userPool = pool;

function clearOAuthCookies(response: NextResponse) {
  for (const name of [
    GOOGLE_OAUTH_STATE_COOKIE,
    GOOGLE_OAUTH_NONCE_COOKIE,
    GOOGLE_OAUTH_VERIFIER_COOKIE,
  ])
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  return response;
}

function fail(requestUrl: string, message: string) {
  return clearOAuthCookies(
    NextResponse.redirect(loginErrorUrl(requestUrl, message)),
  );
}

export async function GET(request: Request) {
  const config = getGoogleConfig(request.url);
  if (!config)
    return fail(request.url, "Google sign-in is not configured yet.");
  const url = new URL(request.url);
  if (url.searchParams.get("error"))
    return fail(request.url, "Google sign-in was cancelled.");
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const expectedNonce = cookieStore.get(GOOGLE_OAUTH_NONCE_COOKIE)?.value;
  const verifier = cookieStore.get(GOOGLE_OAUTH_VERIFIER_COOKIE)?.value;
  if (
    !code ||
    !returnedState ||
    !expectedState ||
    returnedState !== expectedState ||
    !expectedNonce ||
    !verifier
  )
    return fail(request.url, "Google sign-in expired. Please try again.");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
        code_verifier: verifier,
      }),
      cache: "no-store",
    });
    const tokens = (await tokenResponse.json()) as { id_token?: string };
    if (!tokenResponse.ok || !tokens.id_token)
      throw new Error("Token exchange failed");
    const ticket = await new OAuth2Client(config.clientId).verifyIdToken({
      idToken: tokens.id_token,
      audience: config.clientId,
    });
    const payload = ticket.getPayload();
    if (
      !payload?.email ||
      !payload.email_verified ||
      payload.nonce !== expectedNonce
    )
      return fail(request.url, "Google could not verify this email address.");

    const result = await pool.query<{ user_id: string; is_active: boolean }>(
      "SELECT user_id, is_active FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [payload.email],
    );
    const user = result.rows[0];
    if (!user)
      return fail(
        request.url,
        "This Google email is not registered. Contact an administrator.",
      );
    if (!user.is_active)
      return fail(
        request.url,
        "This account is inactive. Contact an administrator.",
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
    const response = clearOAuthCookies(
      NextResponse.redirect(
        new URL(process.env.AUTH_SUCCESS_REDIRECT || "/", request.url),
      ),
    );
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("Google login failed:", error);
    return fail(
      request.url,
      "Unable to sign in with Google. Please try again.",
    );
  }
}
