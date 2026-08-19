import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const globalForDb = globalThis as unknown as {
  userPool?: Pool;
};

// Keep one PostgreSQL pool during Next.js development/hot reloads.
const pool =
  globalForDb.userPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.userPool = pool;
}

export type RegistrationEmployee = {
  employee_id: number;
  employee_code: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  employee_name: string;
  position: string | null;
  contact_no: string | null;
  email: string | null;
  is_active: boolean;
};

/**
 * Gets all active system roles.
 */
export async function getActiveRoles() {
  const result = await pool.query<{ role_name: string }>(
    `
    SELECT role_name
    FROM roles
    WHERE is_active = true
    ORDER BY role_name
    `,
  );

  return result.rows.map((row) => row.role_name);
}

/**
 * Gets active employees that can be linked
 * to a system user account.
 */
export async function getActiveEmployees(): Promise<RegistrationEmployee[]> {
  const result = await pool.query<RegistrationEmployee>(
    `
    SELECT
      employee_id,
      employee_code,
      first_name,
      middle_name,
      last_name,
      employee_name,
      position,
      contact_no,
      email,
      is_active
    FROM public.mt_employee
    WHERE is_active = true
    ORDER BY employee_code ASC
    `,
  );

  return result.rows;
}
