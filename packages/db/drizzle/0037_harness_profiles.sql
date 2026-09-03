CREATE TABLE "eval_harness_profile" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"base" text NOT NULL,
	"files" jsonb NOT NULL,
	"system_prompt" text,
	"env" jsonb,
	"install" text,
	"run" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eval_cell" ADD COLUMN "profile_internal_id" text;--> statement-breakpoint
ALTER TABLE "eval_harness_profile" ADD CONSTRAINT "eval_harness_profile_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "eval_harness_profile_organization_id_name_version_idx" ON "eval_harness_profile" USING btree ("organization_id","name","version");--> statement-breakpoint
ALTER TABLE "eval_cell" ADD CONSTRAINT "eval_cell_profile_internal_id_eval_harness_profile_internal_id_fk" FOREIGN KEY ("profile_internal_id") REFERENCES "public"."eval_harness_profile"("internal_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eval_cell_profile_internal_id_idx" ON "eval_cell" USING btree ("profile_internal_id") WHERE "profile_internal_id" IS NOT NULL;