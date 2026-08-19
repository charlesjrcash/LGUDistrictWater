CREATE TABLE "password_reset_codes" (
  "reset_id" BIGSERIAL PRIMARY KEY,
  "user_id" BIGINT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
  "code_hash" VARCHAR(64) NOT NULL,
  "token_hash" VARCHAR(64) UNIQUE,
  "expires_at" TIMESTAMP(6) NOT NULL,
  "verified_at" TIMESTAMP(6),
  "consumed_at" TIMESTAMP(6),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "password_reset_codes_user_id_created_at_idx"
  ON "password_reset_codes"("user_id", "created_at");
