DROP INDEX "eval_baseline_organization_id_idx";--> statement-breakpoint
DROP INDEX "eval_cell_run_internal_id_idx";--> statement-breakpoint
DROP INDEX "eval_cell_cell_key_idx";--> statement-breakpoint
DROP INDEX "eval_playground_organization_id_idx";--> statement-breakpoint
DROP INDEX "eval_trial_cell_internal_id_idx";--> statement-breakpoint
DROP INDEX "eval_trial_status_idx";--> statement-breakpoint
DROP INDEX "eval_event_trial_internal_id_seq_idx";--> statement-breakpoint
DROP INDEX "eval_playground_organization_id_id_idx";--> statement-breakpoint
ALTER TABLE "eval_run" ADD COLUMN "failure" text;--> statement-breakpoint
CREATE INDEX "eval_baseline_cell_internal_id_idx" ON "eval_baseline" USING btree ("cell_internal_id");--> statement-breakpoint
CREATE INDEX "eval_cell_cell_key_created_at_idx" ON "eval_cell" USING btree ("cell_key","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "eval_event_at_idx" ON "eval_event" USING btree ("at");--> statement-breakpoint
CREATE INDEX "eval_playground_organization_id_updated_at_idx" ON "eval_playground" USING btree ("organization_id","updated_at");--> statement-breakpoint
CREATE INDEX "eval_trial_live_sandbox_idx" ON "eval_trial" USING btree ("status") WHERE status in ('queued', 'running') and sandbox_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "eval_event_trial_internal_id_seq_idx" ON "eval_event" USING btree ("trial_internal_id","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "eval_playground_organization_id_id_idx" ON "eval_playground" USING btree ("organization_id","id");--> statement-breakpoint
ALTER TABLE "eval_run" ADD CONSTRAINT "eval_run_status_check" CHECK (status in ('running','finished','failed'));--> statement-breakpoint
ALTER TABLE "eval_cell" ADD CONSTRAINT "eval_cell_status_check" CHECK (status in ('running','finished','failed'));--> statement-breakpoint
ALTER TABLE "eval_cell" ADD CONSTRAINT "eval_cell_provider_check" CHECK (provider in ('e2b','daytona'));--> statement-breakpoint
ALTER TABLE "eval_cell" ADD CONSTRAINT "eval_cell_harness_check" CHECK (harness in ('codex','claude-code','none'));--> statement-breakpoint
ALTER TABLE "eval_trial" ADD CONSTRAINT "eval_trial_status_check" CHECK (status in ('queued','running','passed','failed','void','exceeded'));--> statement-breakpoint
ALTER TABLE "eval_trial" ADD CONSTRAINT "eval_trial_provider_check" CHECK (provider in ('e2b','daytona'));--> statement-breakpoint
ALTER TABLE "eval_trial" ADD CONSTRAINT "eval_trial_passed_agrees_check" CHECK (status not in ('passed','failed') or passed is not null);
