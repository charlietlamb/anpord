CREATE TABLE "eval_cell" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"run_internal_id" text NOT NULL,
	"task_internal_id" text NOT NULL,
	"cell_key" text NOT NULL,
	"harness" text NOT NULL,
	"harness_version" text NOT NULL,
	"model" text NOT NULL,
	"provider" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eval_event" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"trial_internal_id" text NOT NULL,
	"seq" integer NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eval_run" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"status" text NOT NULL,
	"cell_count" integer NOT NULL,
	"trial_count" integer NOT NULL,
	"started_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "eval_task" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"suite_id" text,
	"name" text NOT NULL,
	"prompt" text NOT NULL,
	"repo_url" text,
	"repo_ref" text,
	"setup_command" text,
	"verify_command" text NOT NULL,
	"workspace" text NOT NULL,
	"bracketed_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "eval_trial" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"cell_internal_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"status" text NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"provider" text NOT NULL,
	"sandbox_id" text,
	"passed" boolean,
	"exit_code" integer,
	"command_count" integer,
	"model_ms" integer,
	"sandbox_ms" integer,
	"void_fields" jsonb,
	"usage" jsonb,
	"failure" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "prompt_channel" DROP CONSTRAINT "prompt_channel_version_internal_id_prompt_version_internal_id_f";
--> statement-breakpoint
ALTER TABLE "prompt_channel" DROP CONSTRAINT "prompt_channel_release_internal_id_prompt_release_internal_id_f";
--> statement-breakpoint
ALTER TABLE "prompt_channel_event" DROP CONSTRAINT "prompt_channel_event_from_version_internal_id_prompt_version_in";
--> statement-breakpoint
ALTER TABLE "prompt_channel_event" DROP CONSTRAINT "prompt_channel_event_to_version_internal_id_prompt_version_inte";
--> statement-breakpoint
ALTER TABLE "prompt_release_version" DROP CONSTRAINT "prompt_release_version_release_internal_id_prompt_release_inter";
--> statement-breakpoint
ALTER TABLE "prompt_release_version" DROP CONSTRAINT "prompt_release_version_version_internal_id_prompt_version_inter";
--> statement-breakpoint
DROP INDEX "account_user_id_idx";--> statement-breakpoint
DROP INDEX "organization_name_idx";--> statement-breakpoint
DROP INDEX "organization_slug_idx";--> statement-breakpoint
DROP INDEX "invitation_email_idx";--> statement-breakpoint
DROP INDEX "invitation_organization_id_idx";--> statement-breakpoint
DROP INDEX "member_organization_id_idx";--> statement-breakpoint
DROP INDEX "member_organization_user_idx";--> statement-breakpoint
DROP INDEX "member_user_id_idx";--> statement-breakpoint
DROP INDEX "session_user_id_idx";--> statement-breakpoint
DROP INDEX "oauth_access_token_user_id_idx";--> statement-breakpoint
DROP INDEX "prompt_version_prompt_internal_id_idx";--> statement-breakpoint
DROP INDEX "prompt_version_prompt_internal_id_version_idx";--> statement-breakpoint
DROP INDEX "prompt_channel_prompt_internal_id_channel_idx";--> statement-breakpoint
DROP INDEX "prompt_channel_version_internal_id_idx";--> statement-breakpoint
DROP INDEX "prompt_organization_id_id_idx";--> statement-breakpoint
DROP INDEX "prompt_organization_id_idx";--> statement-breakpoint
DROP INDEX "prompt_channel_event_created_at_idx";--> statement-breakpoint
DROP INDEX "prompt_channel_event_prompt_internal_id_idx";--> statement-breakpoint
DROP INDEX "oauth_consent_user_id_idx";--> statement-breakpoint
DROP INDEX "prompt_release_prompt_internal_id_idx";--> statement-breakpoint
DROP INDEX "apikey_key_idx";--> statement-breakpoint
DROP INDEX "apikey_reference_id_idx";--> statement-breakpoint
DROP INDEX "channel_one_default_idx";--> statement-breakpoint
DROP INDEX "channel_organization_id_idx";--> statement-breakpoint
DROP INDEX "channel_organization_id_name_idx";--> statement-breakpoint
DROP INDEX "oauth_application_user_id_idx";--> statement-breakpoint
ALTER TABLE "prompt_release_version" DROP CONSTRAINT "prompt_release_version_release_internal_id_version_internal_id_";--> statement-breakpoint
ALTER TABLE "eval_cell" ADD CONSTRAINT "eval_cell_run_internal_id_eval_run_internal_id_fk" FOREIGN KEY ("run_internal_id") REFERENCES "public"."eval_run"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_cell" ADD CONSTRAINT "eval_cell_task_internal_id_eval_task_internal_id_fk" FOREIGN KEY ("task_internal_id") REFERENCES "public"."eval_task"("internal_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_event" ADD CONSTRAINT "eval_event_trial_internal_id_eval_trial_internal_id_fk" FOREIGN KEY ("trial_internal_id") REFERENCES "public"."eval_trial"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_run" ADD CONSTRAINT "eval_run_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_run" ADD CONSTRAINT "eval_run_started_by_user_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_task" ADD CONSTRAINT "eval_task_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_task" ADD CONSTRAINT "eval_task_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_trial" ADD CONSTRAINT "eval_trial_cell_internal_id_eval_cell_internal_id_fk" FOREIGN KEY ("cell_internal_id") REFERENCES "public"."eval_cell"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "eval_cell_run_internal_id_cell_key_idx" ON "eval_cell" USING btree ("run_internal_id","cell_key");--> statement-breakpoint
CREATE INDEX "eval_cell_run_internal_id_idx" ON "eval_cell" USING btree ("run_internal_id");--> statement-breakpoint
CREATE INDEX "eval_cell_cell_key_idx" ON "eval_cell" USING btree ("cell_key");--> statement-breakpoint
CREATE INDEX "eval_event_trial_internal_id_seq_idx" ON "eval_event" USING btree ("trial_internal_id","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "eval_run_organization_id_id_idx" ON "eval_run" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "eval_run_organization_id_idx" ON "eval_run" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "eval_task_organization_id_id_idx" ON "eval_task" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "eval_task_organization_id_idx" ON "eval_task" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "eval_trial_cell_internal_id_ordinal_idx" ON "eval_trial" USING btree ("cell_internal_id","ordinal");--> statement-breakpoint
CREATE INDEX "eval_trial_cell_internal_id_idx" ON "eval_trial" USING btree ("cell_internal_id");--> statement-breakpoint
CREATE INDEX "eval_trial_status_idx" ON "eval_trial" USING btree ("status");--> statement-breakpoint
ALTER TABLE "prompt_channel" ADD CONSTRAINT "prompt_channel_release_internal_id_prompt_release_internal_id_fk" FOREIGN KEY ("release_internal_id") REFERENCES "public"."prompt_release"("internal_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_channel" ADD CONSTRAINT "prompt_channel_version_internal_id_prompt_version_internal_id_fk" FOREIGN KEY ("version_internal_id") REFERENCES "public"."prompt_version"("internal_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_channel_event" ADD CONSTRAINT "prompt_channel_event_from_version_internal_id_prompt_version_internal_id_fk" FOREIGN KEY ("from_version_internal_id") REFERENCES "public"."prompt_version"("internal_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_channel_event" ADD CONSTRAINT "prompt_channel_event_to_version_internal_id_prompt_version_internal_id_fk" FOREIGN KEY ("to_version_internal_id") REFERENCES "public"."prompt_version"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_release_version" ADD CONSTRAINT "prompt_release_version_release_internal_id_prompt_release_internal_id_fk" FOREIGN KEY ("release_internal_id") REFERENCES "public"."prompt_release"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_release_version" ADD CONSTRAINT "prompt_release_version_version_internal_id_prompt_version_internal_id_fk" FOREIGN KEY ("version_internal_id") REFERENCES "public"."prompt_version"("internal_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_release_version_release_version_idx" ON "prompt_release_version" USING btree ("release_internal_id","version_internal_id");--> statement-breakpoint
CREATE INDEX "prompt_release_version_version_internal_id_idx" ON "prompt_release_version" USING btree ("version_internal_id");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organization_name_idx" ON "organization" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_idx" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitation_organization_id_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_organization_id_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_organization_user_idx" ON "member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "member_user_id_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_access_token_user_id_idx" ON "oauth_access_token" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "prompt_version_prompt_internal_id_idx" ON "prompt_version" USING btree ("prompt_internal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_version_prompt_internal_id_version_idx" ON "prompt_version" USING btree ("prompt_internal_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_channel_prompt_internal_id_channel_idx" ON "prompt_channel" USING btree ("prompt_internal_id","channel_internal_id");--> statement-breakpoint
CREATE INDEX "prompt_channel_version_internal_id_idx" ON "prompt_channel" USING btree ("version_internal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_organization_id_id_idx" ON "prompt" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "prompt_organization_id_idx" ON "prompt" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "prompt_channel_event_created_at_idx" ON "prompt_channel_event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "prompt_channel_event_prompt_internal_id_idx" ON "prompt_channel_event" USING btree ("prompt_internal_id");--> statement-breakpoint
CREATE INDEX "oauth_consent_user_id_idx" ON "oauth_consent" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "prompt_release_prompt_internal_id_idx" ON "prompt_release" USING btree ("prompt_internal_id");--> statement-breakpoint
CREATE INDEX "apikey_key_idx" ON "apikey" USING btree ("key");--> statement-breakpoint
CREATE INDEX "apikey_reference_id_idx" ON "apikey" USING btree ("reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "channel_one_default_idx" ON "channel" USING btree ("organization_id") WHERE "channel"."is_default";--> statement-breakpoint
CREATE INDEX "channel_organization_id_idx" ON "channel" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "channel_organization_id_name_idx" ON "channel" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "oauth_application_user_id_idx" ON "oauth_application" USING btree ("user_id");