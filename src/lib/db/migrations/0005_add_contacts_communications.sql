CREATE TABLE "sponsor_contacts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sponsor_id" UUID NOT NULL REFERENCES "sponsors"("id"),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" VARCHAR(100),
  "phone" TEXT,
  "is_primary" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_sponsor_contacts_sponsor_id" ON "sponsor_contacts"("sponsor_id");
CREATE INDEX "idx_sponsor_contacts_email" ON "sponsor_contacts"("email");

CREATE TYPE "communication_status" AS ENUM ('sent', 'delivered', 'failed', 'bounced');

CREATE TABLE "communications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id"),
  "sponsor_id" UUID REFERENCES "sponsors"("id"),
  "sponsor_contact_id" UUID REFERENCES "sponsor_contacts"("id"),
  "template_id" UUID REFERENCES "templates"("id"),
  "deal_id" UUID REFERENCES "deals"("id"),
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "communication_status" NOT NULL DEFAULT 'sent',
  "provider_id" TEXT,
  "to" TEXT NOT NULL,
  "cc" TEXT,
  "bcc" TEXT,
  "sent_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_communications_user_id" ON "communications"("user_id");
CREATE INDEX "idx_communications_sponsor_id" ON "communications"("sponsor_id");
CREATE INDEX "idx_communications_contact_id" ON "communications"("sponsor_contact_id");
CREATE INDEX "idx_communications_template_id" ON "communications"("template_id");
CREATE INDEX "idx_communications_sent_at" ON "communications"("sent_at");
