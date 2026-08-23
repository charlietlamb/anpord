ALTER TABLE "eval_event" ADD COLUMN IF NOT EXISTS "occurred_at" timestamp;--> statement-breakpoint
ALTER TABLE "eval_event" ADD COLUMN IF NOT EXISTS "started_at" timestamp;
