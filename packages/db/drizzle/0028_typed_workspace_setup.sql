ALTER TABLE "eval_task" ADD COLUMN "prepare_name" text;--> statement-breakpoint
ALTER TABLE "eval_task" ADD COLUMN "prepare_source" text;--> statement-breakpoint
ALTER TABLE "eval_task" DROP COLUMN "setup_command";--> statement-breakpoint
ALTER TABLE "eval_trial" ADD COLUMN "prepared" jsonb;
