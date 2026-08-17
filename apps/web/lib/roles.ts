import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const globalForDb = globalThis as unknown as { userPool?: Pool };

// Keep a single pool while Next.js hot reloads server files during development.
const pool = globalForDb.userPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForDb.userPool = pool;

/** Reads the active role names used by both the page and the roles API. */
export async function getActiveRoles() {
  const result = await pool.query<{ role_name: string }>("SELECT role_name FROM roles WHERE is_active = true ORDER BY role_name");
  return result.rows.map((row) => row.role_name);
}
