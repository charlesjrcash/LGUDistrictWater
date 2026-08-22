ALTER TABLE "users"
  ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "locked_until" TIMESTAMP(6),
  ADD COLUMN "mfa_enabled" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "user_sessions"
  ADD COLUMN "last_seen_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "mfa_codes" (
  "mfa_code_id" BIGSERIAL PRIMARY KEY,
  "user_id" BIGINT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
  "purpose" VARCHAR(20) NOT NULL,
  "code_hash" VARCHAR(64) NOT NULL,
  "token_hash" VARCHAR(64) UNIQUE,
  "expires_at" TIMESTAMP(6) NOT NULL,
  "consumed_at" TIMESTAMP(6),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "mfa_codes_user_id_created_at_idx"
  ON "mfa_codes"("user_id", "created_at");
