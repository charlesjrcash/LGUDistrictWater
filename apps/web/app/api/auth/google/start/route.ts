import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createCodeChallenge,
  getGoogleConfig,
  GOOGLE_OAUTH_COOKIE_MAX_AGE,
  GOOGLE_OAUTH_NONCE_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_VERIFIER_COOKIE,
  loginErrorUrl,
  randomOAuthValue,
} from "@/lib/google-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = getGoogleConfig(request.url);
  if (!config)
    return NextResponse.redirect(
      loginErrorUrl(request.url, "Google sign-in is not configured yet."),
    );

  const state = randomOAuthValue();
  const nonce = randomOAuthValue();
  const verifier = randomOAuthValue(48);
  const secure = process.env.NODE_ENV === "production";
  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: GOOGLE_OAUTH_COOKIE_MAX_AGE,
  };
  cookieStore.set(GOOGLE_OAUTH_STATE_COOKIE, state, options);
  cookieStore.set(GOOGLE_OAUTH_NONCE_COOKIE, nonce, options);
  cookieStore.set(GOOGLE_OAUTH_VERIFIER_COOKIE, verifier, options);

  const authorizationUrl = new URL(
    "https://accounts.google.com/o/oauth2/v2/auth",
  );
  authorizationUrl.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email",
    state,
    nonce,
    code_challenge: createCodeChallenge(verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return NextResponse.redirect(authorizationUrl);
}
