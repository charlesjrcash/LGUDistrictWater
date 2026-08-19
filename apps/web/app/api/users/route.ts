import { Pool } from "pg";
import { hashPassword } from "@/lib/auth";
import { sendTemporaryCredentialsEmail } from "@/lib/mailer";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as {
  userPool?: Pool;
};

const pool =
  globalForDb.userPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.userPool = pool;
}

/**
 * Converts an unknown value into a trimmed string.
 */
function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Handles POST /api/users
 *
 * The registration form sends:
 *
 * - employeeId
 * - username
 * - role
 * - password
 * - confirmPassword
 *
 * The API gets the employee's:
 *
 * - first_name
 * - middle_name
 * - last_name
 * - email
 *
 * directly from mt_employee.
 *
 * PostgreSQL function fn_create_user() then handles:
 *
 * - duplicate username
 * - duplicate email
 * - employee validation
 * - active role validation
 * - users INSERT
 * - user_roles INSERT
 */
export async function POST(request: Request) {
  try {
    // ---------------------------------------------------------
    // 1. Read request body
    // ---------------------------------------------------------

    const body = await request.json();

    // ---------------------------------------------------------
    // 2. Read values submitted by registration form
    // ---------------------------------------------------------

    const username = clean(body.username);

    const employeeId = Number(body.employeeId);

    const role = clean(body.role);

    const password = typeof body.password === "string" ? body.password : "";

    const confirmPassword =
      typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    // ---------------------------------------------------------
    // 3. Validate employee ID
    // ---------------------------------------------------------

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return Response.json(
        {
          message: "Please select an employee.",
        },
        { status: 400 },
      );
    }

    // ---------------------------------------------------------
    // 4. Validate required fields
    // ---------------------------------------------------------

    if (!username || !role || !password || !confirmPassword) {
      return Response.json(
        {
          message: "Please complete all required fields.",
        },
        { status: 400 },
      );
    }

    // ---------------------------------------------------------
    // 5. Username validation
    // ---------------------------------------------------------

    if (username.length < 3 || username.length > 50) {
      return Response.json(
        {
          message: "Username must contain between 3 and 50 characters.",
        },
        { status: 400 },
      );
    }

    // ---------------------------------------------------------
    // 6. Password validation
    // ---------------------------------------------------------

    if (password.length < 8) {
      return Response.json(
        {
          message: "Password must contain at least 8 characters.",
        },
        { status: 400 },
      );
    }

    // ---------------------------------------------------------
    // 7. Confirm password
    // ---------------------------------------------------------

    if (password !== confirmPassword) {
      return Response.json(
        {
          message: "Passwords do not match.",
        },
        { status: 400 },
      );
    }

    // ---------------------------------------------------------
    // 8. Temporary password expiration
    // ---------------------------------------------------------

    const temporaryPasswordExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );

    // ---------------------------------------------------------
    // 9. Hash password
    // ---------------------------------------------------------

    const passwordHash = await hashPassword(password);

    // ---------------------------------------------------------
    // 10. Get PostgreSQL connection
    // ---------------------------------------------------------

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // -------------------------------------------------------
      // 11. Get employee information
      // -------------------------------------------------------

      const employeeResult = await client.query<{
        employee_id: number;
        first_name: string | null;
        middle_name: string | null;
        last_name: string | null;
        email: string | null;
        is_active: boolean;
      }>(
        `
        SELECT
          employee_id,
          first_name,
          middle_name,
          last_name,
          email,
          is_active
        FROM public.mt_employee
        WHERE employee_id = $1
        LIMIT 1
        `,
        [employeeId],
      );

      // -------------------------------------------------------
      // 12. Employee does not exist
      // -------------------------------------------------------

      if (employeeResult.rowCount === 0) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            message: "The selected employee was not found.",
          },
          { status: 400 },
        );
      }

      const employee = employeeResult.rows[0];

      // -------------------------------------------------------
      // 13. Employee must be active
      // -------------------------------------------------------

      if (!employee.is_active) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            message: "The selected employee is inactive.",
          },
          { status: 400 },
        );
      }

      // -------------------------------------------------------
      // 14. Get employee information
      // -------------------------------------------------------

      const firstName = clean(employee.first_name);

      const middleName = clean(employee.middle_name) || null;

      const lastName = clean(employee.last_name);

      const email = clean(employee.email).toLowerCase();

      // -------------------------------------------------------
      // 15. Validate employee information
      // -------------------------------------------------------

      if (!firstName || !lastName) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            message:
              "The selected employee does not have complete name information.",
          },
          { status: 400 },
        );
      }

      // -------------------------------------------------------
      // 16. Employee email is required because credentials
      //     will be sent through email.
      // -------------------------------------------------------

      if (!email) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            message: "The selected employee does not have an email address.",
          },
          { status: 400 },
        );
      }

      // -------------------------------------------------------
      // 17. Validate employee email
      // -------------------------------------------------------

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        await client.query("ROLLBACK");

        return Response.json(
          {
            message: "The selected employee has an invalid email address.",
          },
          { status: 400 },
        );
      }

      // -------------------------------------------------------
      // 18. Call PostgreSQL fn_create_user()
      //
      // Function signature:
      //
      // fn_create_user(
      //   p_username,
      //   p_password_hash,
      //   p_employee_id,
      //   p_first_name,
      //   p_middle_name,
      //   p_last_name,
      //   p_email,
      //   p_role_name,
      //   p_temporary_password_expires_at
      // )
      // -------------------------------------------------------

      const userResult = await client.query<{
        user_id: string;
      }>(
        `
        SELECT public.fn_create_user(
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9
        ) AS user_id
        `,
        [
          username,
          passwordHash,
          employeeId,
          firstName,
          middleName,
          lastName,
          email,
          role,
          temporaryPasswordExpiresAt,
        ],
      );

      // -------------------------------------------------------
      // 19. Get newly created user ID
      // -------------------------------------------------------

      const userId = userResult.rows[0]?.user_id;

      if (!userId) {
        throw new Error("User creation did not return a user ID.");
      }

      console.log("User created:", userId, "Employee:", employeeId);

      // -------------------------------------------------------
      // 20. Commit database transaction
      // -------------------------------------------------------

      await client.query("COMMIT");

      // -------------------------------------------------------
      // 21. Send temporary credentials email
      //
      // IMPORTANT:
      // Email is sent only after COMMIT succeeds.
      // -------------------------------------------------------

      try {
        await sendTemporaryCredentialsEmail({
          to: email,
          username,
          temporaryPassword: password,
          expiresAt: temporaryPasswordExpiresAt,
        });

        return Response.json(
          {
            message: "User created and temporary credentials were emailed.",
          },
          { status: 201 },
        );
      } catch (error) {
        console.error("Temporary credential email failed:", error);

        return Response.json(
          {
            message:
              "User created, but the credential email could not be sent. Check the SMTP configuration before retrying delivery.",
          },
          { status: 201 },
        );
      }
    } catch (error) {
      // -------------------------------------------------------
      // 22. Roll back database changes
      // -------------------------------------------------------

      await client.query("ROLLBACK");

      const message = error instanceof Error ? error.message : "";

      console.error("fn_create_user error:", error);

      // -------------------------------------------------------
      // 23. Handle known PostgreSQL function errors
      // -------------------------------------------------------

      if (message.includes("USERNAME_EXISTS")) {
        return Response.json(
          {
            message: "That username is already registered.",
          },
          { status: 409 },
        );
      }

      if (message.includes("EMAIL_EXISTS")) {
        return Response.json(
          {
            message: "That email address is already registered.",
          },
          { status: 409 },
        );
      }

      if (message.includes("INVALID_EMPLOYEE")) {
        return Response.json(
          {
            message: "The selected employee is invalid or inactive.",
          },
          { status: 400 },
        );
      }

      if (message.includes("INVALID_ROLE")) {
        return Response.json(
          {
            message: "Select an active role from the list.",
          },
          { status: 400 },
        );
      }

      // -------------------------------------------------------
      // 24. Unknown database error
      // -------------------------------------------------------

      throw error;
    } finally {
      // -------------------------------------------------------
      // 25. Return connection to PostgreSQL pool
      // -------------------------------------------------------

      client.release();
    }
  } catch (error) {
    console.error("User registration failed:", error);

    return Response.json(
      {
        message:
          "The user could not be saved. Check the database connection and try again.",
      },
      { status: 500 },
    );
  }
}
