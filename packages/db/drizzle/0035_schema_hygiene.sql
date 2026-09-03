-- Value-list checks duplicated the literal unions decoded at the edge and had
-- to be re-created for every new provider; the harness one blocked seven of
-- eight harnesses before it was dropped. The invariant one stays, and is now
-- declared in the Drizzle schema so a generated migration keeps it.
ALTER TABLE "eval_run" DROP CONSTRAINT IF EXISTS "eval_run_status_check";
--> statement-breakpoint
ALTER TABLE "eval_cell" DROP CONSTRAINT IF EXISTS "eval_cell_status_check";
--> statement-breakpoint
ALTER TABLE "eval_cell" DROP CONSTRAINT IF EXISTS "eval_cell_provider_check";
--> statement-breakpoint
ALTER TABLE "eval_trial" DROP CONSTRAINT IF EXISTS "eval_trial_status_check";
--> statement-breakpoint
ALTER TABLE "eval_trial" DROP CONSTRAINT IF EXISTS "eval_trial_provider_check";
--> statement-breakpoint
-- Each a prefix of a unique index on the same table.
DROP INDEX IF EXISTS "eval_run_organization_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "eval_task_organization_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "prompt_organization_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "channel_organization_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "prompt_version_prompt_internal_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "member_organization_id_idx";
--> statement-breakpoint
-- Nothing filters by classification.
DROP INDEX IF EXISTS "eval_trial_cost_classification_idx";
--> statement-breakpoint
CREATE INDEX "eval_run_organization_id_created_at_idx" ON "eval_run" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "eval_cell_task_internal_id_idx" ON "eval_cell" USING btree ("task_internal_id");
--> statement-breakpoint
-- Never referenced.
ALTER TABLE "eval_task" DROP COLUMN IF EXISTS "suite_id";
--> statement-breakpoint
-- Never written; the run's start is its created_at.
ALTER TABLE "eval_run" DROP COLUMN IF EXISTS "started_at";
