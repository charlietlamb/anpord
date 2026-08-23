ALTER TABLE "eval_task" ADD COLUMN "source_kind" text;--> statement-breakpoint
ALTER TABLE "eval_task" ADD COLUMN "source_files" jsonb;--> statement-breakpoint
ALTER TABLE "eval_task" ADD CONSTRAINT "eval_task_source_kind_check" CHECK ("eval_task"."source_kind" in ('empty', 'files', 'repo'));