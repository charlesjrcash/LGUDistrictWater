import { Pool } from "pg";
import { hashPassword } from "@/lib/auth";
import { sendTemporaryCredentialsEmail } from "@/lib/mailer";

export const runtime = "nodejs";

const globalForDb = globalThis as unknown as {
  userPool?: Pool;
};

// Reuse one PostgreSQL connection pool during local hot reloads.
const pool =
  globalForDb.userPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.userPool = pool;
}

/** Converts an unknown request value into a trimmed string before validation. */
function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Handles POST /api/users from the registration form.
 *
 * PostgreSQL function fn_create_user() is responsible for:
 * - duplicate username checking
 * - duplicate email checking
 * - active role validation
 * - users INSERT
 * - user_roles INSERT
 *
 * The API remains responsible for:
 * - request validation
 * - password hashing
 * - transaction handling
 * - sending the temporary credentials email
 */
export async function POST(request: Request) {
  try {
    // Parse request body.
    const body = await request.json();

    // Normalize form fields.
    const username = clean(body.username);
    const firstName = clean(body.firstName);
    const middleName = clean(body.middleName) || null;
    const lastName = clean(body.lastName);
    const email = clean(body.email).toLowerCase();
    const role = clean(body.role);

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const confirmPassword =
      typeof body.confirmPassword === "string"
        ? body.confirmPassword
        : "";

    // Required fields.
    if (
      !username ||
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !role
    ) {
      return Response.json(
        {
          message: "Please complete all required fields.",
        },
        { status: 400 }
      );
    }

    // Length validation.
    if (
      username.length < 3 ||
      username.length > 50 ||
      firstName.length > 50 ||
      (middleName?.length ?? 0) > 50 ||
      lastName.length > 50 ||
      email.length > 150
    ) {
      return Response.json(
        {
          message:
            "One or more fields have an invalid length.",
        },
        { status: 400 }
      );
    }

    // Email validation.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        {
          message: "Enter a valid email address.",
        },
        { status: 400 }
      );
    }

    // Password validation.
    if (password.length < 8) {
      return Response.json(
        {
          message:
            "Password must contain at least 8 characters.",
        },
        { status: 400 }
      );
    }

    // Confirm password.
    if (password !== confirmPassword) {
      return Response.json(
        {
          message: "Passwords do not match.",
        },
        { status: 400 }
      );
    }

    // Temporary password expires after 24 hours.
    const temporaryPasswordExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    // Hash password before storing it.
    const passwordHash = await hashPassword(password);

    // Get one PostgreSQL client for the transaction.
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      /*
       * PostgreSQL handles:
       *
       * 1. Duplicate username
       * 2. Duplicate email
       * 3. Active role validation
       * 4. users INSERT
       * 5. user_roles INSERT
       *
       * The function returns the newly created user_id.
       */
      const userResult = await client.query<{ user_id: string }>(
        `
        SELECT public.fn_create_user(
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8
        ) AS user_id
        `,
        [
          username,
          passwordHash,
          firstName,
          middleName,
          lastName,
          email,
          role,
          temporaryPasswordExpiresAt,
        ]
      );

      const userId = userResult.rows[0].user_id;

      console.log("User created:", userId);

      // Everything related to the user was successful.
      await client.query("COMMIT");

      /*
       * Send email only AFTER the database transaction succeeds.
       */
      try {
        await sendTemporaryCredentialsEmail({
          to: email,
          username,
          temporaryPassword: password,
          expiresAt: temporaryPasswordExpiresAt,
        });

        return Response.json(
          {
            message:
              "User created and temporary credentials were emailed.",
          },
          { status: 201 }
        );
      } catch (error) {
        console.error(
          "Temporary credential email failed:",
          error
        );

        return Response.json(
          {
            message:
              "User created, but the credential email could not be sent. Check the SMTP configuration before retrying delivery.",
          },
          { status: 201 }
        );
      }
    } catch (error) {
      // Undo the transaction if the database operation fails.
      await client.query("ROLLBACK");

      const message =
        error instanceof Error
          ? error.message
          : "";

      /*
       * Handle errors raised by fn_create_user().
       */
      if (message.includes("USERNAME_EXISTS")) {
        return Response.json(
          {
            message:
              "That username is already registered.",
          },
          { status: 409 }
        );
      }

      if (message.includes("EMAIL_EXISTS")) {
        return Response.json(
          {
            message:
              "That email address is already registered.",
          },
          { status: 409 }
        );
      }

      if (message.includes("INVALID_ROLE")) {
        return Response.json(
          {
            message:
              "Select an active role from the list.",
          },
          { status: 400 }
        );
      }

      // Unknown database error.
      throw error;
    } finally {
      // Return the client to the pool.
      client.release();
    }
  } catch (error) {
    console.error(
      "User registration failed:",
      error
    );

    return Response.json(
      {
        message:
          "The user could not be saved. Check the database connection and try again.",
      },
      { status: 500 }
    );
  }
}