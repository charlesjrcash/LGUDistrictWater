import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export const SESSION_COOKIE_NAME = "lgu_session";
export const SESSION_DURATION_SECONDS = 8 * 60 * 60;
export const PASSWORD_RESET_COOKIE_NAME = "lgu_password_reset";
export const PASSWORD_RESET_DURATION_SECONDS = 10 * 60;

/** Hashes a password with a random salt before it is written to PostgreSQL. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

/** Safely compares a supplied password with the persisted scrypt password hash. */
export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, storedKey] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !storedKey) return false;

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const expectedKey = Buffer.from(storedKey, "hex");
  return (
    expectedKey.length === derivedKey.length &&
    timingSafeEqual(expectedKey, derivedKey)
  );
}

/** Creates the opaque value stored in the user's HTTP-only session cookie. */
export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

/** Stores only a SHA-256 digest of a session token, not the token itself. */
export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
