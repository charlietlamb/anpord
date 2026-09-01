CREATE TABLE "eval_trial_cost" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"trial_internal_id" text NOT NULL,
	"component" text NOT NULL,
	"classification" text NOT NULL,
	"amount_nanos" bigint,
	"source" text NOT NULL,
	"explanation" text NOT NULL,
	"detail" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eval_trial_cost" ADD CONSTRAINT "eval_trial_cost_trial_internal_id_eval_trial_internal_id_fk" FOREIGN KEY ("trial_internal_id") REFERENCES "public"."eval_trial"("internal_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "eval_trial_cost_trial_component_idx" ON "eval_trial_cost" USING btree ("trial_internal_id","component");
--> statement-breakpoint
CREATE INDEX "eval_trial_cost_classification_idx" ON "eval_trial_cost" USING btree ("classification");
