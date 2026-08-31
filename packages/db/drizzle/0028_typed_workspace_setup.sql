ALTER TABLE "eval_task" ADD COLUMN "setup_name" text;--> statement-breakpoint
ALTER TABLE "eval_task" ADD COLUMN "setup_source" text;--> statement-breakpoint
ALTER TABLE "eval_task" DROP COLUMN "setup_command";--> statement-breakpoint
ALTER TABLE "eval_trial" ADD COLUMN "setup_value" jsonb;
