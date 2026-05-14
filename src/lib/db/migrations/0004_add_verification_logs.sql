CREATE TYPE "verification_action" AS ENUM ('auto_complete', 'manual_review', 'overdue_alert', 'verification_failed', 'verification_passed');

CREATE TABLE "verification_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "deliverable_id" UUID NOT NULL REFERENCES "deliverables"("id"),
  "deal_id" UUID REFERENCES "deals"("id"),
  "user_id" UUID NOT NULL REFERENCES "users"("id"),
  "episode_id" TEXT,
  "action" "verification_action" NOT NULL,
  "confidence" INTEGER NOT NULL,
  "placement" VARCHAR(20),
  "keyword_match_count" INTEGER NOT NULL DEFAULT 0,
  "keyword_total_count" INTEGER NOT NULL DEFAULT 0,
  "previous_status" "deliverable_status",
  "new_status" "deliverable_status",
  "metadata" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_verification_logs_deliverable_id" ON "verification_logs"("deliverable_id");
CREATE INDEX "idx_verification_logs_user_id" ON "verification_logs"("user_id");
CREATE INDEX "idx_verification_logs_action" ON "verification_logs"("action");
CREATE INDEX "idx_verification_logs_created_at" ON "verification_logs"("created_at");
