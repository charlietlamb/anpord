CREATE TABLE "eval_trial_journal" (
	"trial_internal_id" text PRIMARY KEY NOT NULL,
	"events" jsonb NOT NULL,
	"event_count" integer NOT NULL,
	"compacted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eval_trial_journal" ADD CONSTRAINT "eval_trial_journal_trial_internal_id_eval_trial_internal_id_fk" FOREIGN KEY ("trial_internal_id") REFERENCES "public"."eval_trial"("internal_id") ON DELETE cascade ON UPDATE no action;
