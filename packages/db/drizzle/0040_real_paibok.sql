ALTER TABLE "eval_task" ADD COLUMN "validator_config" jsonb;--> statement-breakpoint
ALTER TABLE "eval_trial" ADD COLUMN "judgments" jsonb;