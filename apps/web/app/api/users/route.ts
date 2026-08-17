import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { Pool } from "pg";

export const runtime = "nodejs";

// Only these application roles may be assigned during registration.
const allowedRoles = new Set(["Administrator", "Billing Office", "Cashier", "Collection Officer", "Accounting Officer", "Report User", "Viewer"]);
const scrypt = promisify(scryptCallback);
const globalForDb = globalThis as unknown as { userPool?: Pool };

// Reuse one PostgreSQL connection pool during local hot reloads. DATABASE_URL is
// server-only and must point to the PostgreSQL database that contains the schema.
const pool = globalForDb.userPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForDb.userPool = pool;

/** Converts an unknown request value into a trimmed string before validation. */
function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

/** Creates a salted, one-way scrypt hash; plain-text passwords are never stored. */
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Handles POST /api/users from the registration form.
 * Validates the payload, creates the user and role assignment in one transaction,
 * and rolls everything back if any database operation fails.
 */
export async function POST(request: Request) {
  try {
    // Parse and normalize form fields before applying server-side validation.
    const body = await request.json();
    const username = clean(body.username), firstName = clean(body.firstName), middleName = clean(body.middleName) || null;
    const lastName = clean(body.lastName), email = clean(body.email).toLowerCase(), role = clean(body.role);
    const password = typeof body.password === "string" ? body.password : "", confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
    if (!username || !firstName || !lastName || !email || !password || !role) return Response.json({ message: "Please complete all required fields." }, { status: 400 });
    if (username.length < 3 || username.length > 50 || firstName.length > 50 || (middleName?.length ?? 0) > 50 || lastName.length > 50 || email.length > 150) return Response.json({ message: "One or more fields have an invalid length." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ message: "Enter a valid email address." }, { status: 400 });
    if (password.length < 8) return Response.json({ message: "Password must contain at least 8 characters." }, { status: 400 });
    if (password !== confirmPassword) return Response.json({ message: "Passwords do not match." }, { status: 400 });
    if (!allowedRoles.has(role)) return Response.json({ message: "Select a valid role." }, { status: 400 });

    // A single client is used so all writes succeed or fail together.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Keep usernames and email addresses unique even when validation is bypassed.
      const duplicate = await client.query("SELECT 1 FROM users WHERE username = $1 OR LOWER(email) = $2 LIMIT 1", [username, email]);
      if (duplicate.rowCount) { await client.query("ROLLBACK"); return Response.json({ message: "That username or email is already registered." }, { status: 409 }); }

      // Insert the account, ensure its role exists, then link both records.
      const passwordHash = await hashPassword(password);
      const userResult = await client.query<{ user_id: string }>("INSERT INTO users (username, password_hash, first_name, middle_name, last_name, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id", [username, passwordHash, firstName, middleName, lastName, email]);
      const roleResult = await client.query<{ role_id: string }>("INSERT INTO roles (role_name) VALUES ($1) ON CONFLICT (role_name) DO UPDATE SET is_active = true RETURNING role_id", [role]);
      await client.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", [userResult.rows[0].user_id, roleResult.rows[0].role_id]);
      await client.query("COMMIT");
      return Response.json({ message: "User created successfully." }, { status: 201 });
    } catch (error) {
      // Do not leave partial user or role records when a query fails.
      await client.query("ROLLBACK");
      throw error;
    } finally {
      // Always return the checked-out client to the shared pool.
      client.release();
    }
  } catch (error) {
    // Keep database implementation details out of the response, but log them server-side.
    console.error("User registration failed:", error);
    return Response.json({ message: "The user could not be saved. Check the database connection and try again." }, { status: 500 });
  }
}
