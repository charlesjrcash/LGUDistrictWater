import { createHash, randomBytes } from "node:crypto";

export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";
export const GOOGLE_OAUTH_NONCE_COOKIE = "google_oauth_nonce";
export const GOOGLE_OAUTH_VERIFIER_COOKIE = "google_oauth_verifier";
export const GOOGLE_OAUTH_COOKIE_MAX_AGE = 10 * 60;

export function randomOAuthValue(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function createCodeChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function getGoogleConfig(requestUrl: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const callback = new URL("/api/auth/google/callback", requestUrl).toString();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim() || callback;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri };
}

export function loginErrorUrl(requestUrl: string, message: string) {
  const url = new URL("/login", requestUrl);
  url.searchParams.set("error", message);
  return url;
}
