import nodemailer from "nodemailer";

type TemporaryCredentials = {
  to: string;
  username: string;
  temporaryPassword: string;
  expiresAt: Date;
};

type PasswordResetCode = {
  to: string;
  code: string;
  expiresAt: Date;
};

/** Escapes dynamic values before inserting them into the HTML email template. */
function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

/**
 * Creates the server-only SMTP client. All mail credentials remain in .env.local
 * (or deployment environment variables) and are never exposed to the browser.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass || !Number.isInteger(port)) {
    throw new Error("Email delivery is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
  });
}

/** Sends a time-limited temporary password after a new user account is created. */
export async function sendTemporaryCredentialsEmail({ to, username, temporaryPassword, expiresAt }: TemporaryCredentials) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from) throw new Error("Email delivery is not configured. Set SMTP_FROM or SMTP_USER.");

  const expiresAtLabel = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(expiresAt);
  const safeUsername = escapeHtml(username);
  const safePassword = escapeHtml(temporaryPassword);
  const safeExpiry = escapeHtml(expiresAtLabel);

  await createTransporter().sendMail({
    from,
    to,
    subject: "Your LGU District Water temporary account credentials",
    text: `Your LGU District Water account has been created.\n\nUsername: ${username}\nTemporary password: ${temporaryPassword}\n\nThis temporary password expires on ${expiresAtLabel} and must be changed when you first sign in.`,
    html: `<p>Your LGU District Water account has been created.</p><p><strong>Username:</strong> ${safeUsername}<br /><strong>Temporary password:</strong> ${safePassword}</p><p>This temporary password expires on <strong>${safeExpiry}</strong> and must be changed when you first sign in.</p>`,
  });
}

/** Sends a short-lived verification code without exposing account details. */
export async function sendPasswordResetCodeEmail({ to, code, expiresAt }: PasswordResetCode) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from) throw new Error("Email delivery is not configured. Set SMTP_FROM or SMTP_USER.");

  const expiresAtLabel = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(expiresAt);
  await createTransporter().sendMail({
    from,
    to,
    subject: "Your LGU District Water password reset code",
    text: `Your password reset verification code is ${code}. It expires on ${expiresAtLabel}. If you did not request this code, you can ignore this email.`,
    html: `<p>Use this verification code to reset your LGU District Water password:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${escapeHtml(code)}</p><p>This code expires on <strong>${escapeHtml(expiresAtLabel)}</strong>.</p><p>If you did not request this code, you can ignore this email.</p>`,
  });
}
