CREATE TABLE "eval_trial_artifact" (
	"trial_internal_id" text NOT NULL,
	"sha256" text NOT NULL,
	"path" text NOT NULL,
	"content" text NOT NULL,
	CONSTRAINT "eval_trial_artifact_trial_internal_id_sha256_pk" PRIMARY KEY("trial_internal_id","sha256")
);
--> statement-breakpoint
ALTER TABLE "eval_trial_artifact" ADD CONSTRAINT "eval_trial_artifact_trial_internal_id_eval_trial_internal_id_fk" FOREIGN KEY ("trial_internal_id") REFERENCES "public"."eval_trial"("internal_id") ON DELETE cascade ON UPDATE no action;