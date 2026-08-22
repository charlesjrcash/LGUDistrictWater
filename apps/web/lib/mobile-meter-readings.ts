type DatabaseRow = Record<string, unknown>;

export function fail(message: string, status: number) {
  return Response.json({ success: false, message }, { status });
}

export function text(value: unknown, maximum = 4_000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export function id(value: unknown) {
  const parsed = text(value, 30);
  return /^\d+$/.test(parsed) ? parsed : null;
}

export function decimal(value: unknown, options?: { allowNegative?: boolean }) {
  const parsed = text(value, 60);
  const expression = options?.allowNegative
    ? /^-?\d+(?:\.\d+)?$/
    : /^\d+(?:\.\d+)?$/;
  return expression.test(parsed) ? parsed : null;
}

export function date(value: unknown) {
  const parsed = text(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(parsed) && !Number.isNaN(Date.parse(`${parsed}T00:00:00Z`))
    ? parsed
    : null;
}

/** A local timestamp is intentionally sent to PostgreSQL without a timezone. */
export function localTimestamp(value: unknown) {
  const parsed = text(value, 40);
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?$/.test(parsed)
    ? parsed
    : null;
}

export function value(row: DatabaseRow, key: string): unknown {
  return row[key];
}

export function stringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** pg parses PostgreSQL date/timestamp values as Date objects. Reformatting in
 * the server's local timezone avoids moving a date or local capture time. */
export function localDateValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (!(value instanceof Date)) return String(value);
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function localTimestampValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (!(value instanceof Date)) return String(value);
  return `${localDateValue(value)}T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
}

export function requiredString(row: DatabaseRow, key: string) {
  return stringValue(value(row, key)) ?? "";
}

/**
 * Database functions deliberately own workflow validation. This maps their
 * expected state errors to stable API messages without exposing SQL details.
 */
export function mobileDatabaseError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("not found") || message.includes("does not exist")) return "The requested mobile batch or meter reading was not found.";
  if (message.includes("acknowledged")) return "The mobile batch must be acknowledged before readings can be synchronized.";
  if (message.includes("meter reader") || message.includes("assigned reader")) return "The selected meter reader is not assigned to this batch.";
  if (message.includes("belong") && message.includes("batch")) return "The meter reading does not belong to this mobile batch.";
  if (message.includes("in_progress") || message.includes("in progress")) return "The meter reading is not ready for mobile synchronization.";
  if (message.includes("normal")) return "A NORMAL reading must be greater than its previous reading.";
  if (message.includes("zero")) return "A ZERO reading must equal its previous reading.";
  if (message.includes("active") && message.includes("status")) return "The selected reading status is inactive or unavailable.";
  if (message.includes("prepared") || message.includes("downloaded") || message.includes("transition")) return "The requested mobile batch state transition is not valid.";
  return fallback;
}

export function statusDto(row: DatabaseRow) {
  return {
    readingStatusId: requiredString(row, "reading_status_id"),
    statusCode: requiredString(row, "status_code"),
    statusName: requiredString(row, "status_name"),
    description: stringValue(value(row, "description")),
  };
}
