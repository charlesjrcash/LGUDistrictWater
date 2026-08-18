-- Preserve legacy service accounts while providing a durable one-to-one link for
-- accounts created from approved service applications.
ALTER TABLE "service_accounts"
ADD COLUMN "application_id" BIGINT;

CREATE UNIQUE INDEX "uq_service_account_application"
ON "service_accounts"("application_id");

ALTER TABLE "service_accounts"
ADD CONSTRAINT "fk_service_account_application"
FOREIGN KEY ("application_id") REFERENCES "service_applications"("application_id")
ON DELETE NO ACTION ON UPDATE NO ACTION;
