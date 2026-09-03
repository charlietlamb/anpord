-- The payload already carries at and startedAt; the columns duplicated them.
ALTER TABLE "eval_event" DROP COLUMN IF EXISTS "kind";
--> statement-breakpoint
ALTER TABLE "eval_event" DROP COLUMN IF EXISTS "occurred_at";
--> statement-breakpoint
ALTER TABLE "eval_event" DROP COLUMN IF EXISTS "started_at";
--> statement-breakpoint
-- Always null; a deliberate promotion was never built.
ALTER TABLE "eval_baseline" DROP COLUMN IF EXISTS "promoted_by";
--> statement-breakpoint
-- Set-null and cascade foreign keys on user and connection deletes scanned these tables.
CREATE INDEX "eval_run_started_by_idx" ON "eval_run" USING btree ("started_by");
--> statement-breakpoint
CREATE INDEX "eval_task_created_by_idx" ON "eval_task" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX "eval_playground_created_by_idx" ON "eval_playground" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX "eval_cell_harness_credential_connection_id_idx" ON "eval_cell" USING btree ("harness_credential_connection_id");
--> statement-breakpoint
CREATE INDEX "eval_cell_sandbox_credential_connection_id_idx" ON "eval_cell" USING btree ("sandbox_credential_connection_id");
--> statement-breakpoint
CREATE INDEX "prompt_created_by_idx" ON "prompt" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX "prompt_version_created_by_idx" ON "prompt_version" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX "prompt_release_created_by_idx" ON "prompt_release" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX "prompt_channel_updated_by_idx" ON "prompt_channel" USING btree ("updated_by");
--> statement-breakpoint
CREATE INDEX "prompt_event_actor_id_idx" ON "prompt_event" USING btree ("actor_id");
--> statement-breakpoint
CREATE INDEX "prompt_event_version_internal_id_idx" ON "prompt_event" USING btree ("version_internal_id");
--> statement-breakpoint
CREATE INDEX "credential_connection_created_by_idx" ON "credential_connection" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX "credential_connection_owner_user_id_idx" ON "credential_connection" USING btree ("owner_user_id");
--> statement-breakpoint
CREATE INDEX "github_installation_installed_by_user_id_idx" ON "github_installation" USING btree ("installed_by_user_id");
