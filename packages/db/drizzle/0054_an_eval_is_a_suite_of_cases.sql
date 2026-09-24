CREATE TABLE "eval_batch" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"trigger" jsonb,
	"local" boolean DEFAULT false NOT NULL,
	"status" text NOT NULL,
	"failure" text,
	"started_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "eval_case_version" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"case_internal_id" text NOT NULL,
	"definition_hash" text NOT NULL,
	"prompt" text NOT NULL,
	"source" jsonb NOT NULL,
	"prepare" jsonb,
	"validator" jsonb,
	"verify" text,
	"user" jsonb,
	"cache" jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eval_case" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"suite_internal_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eval_event" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"trial_internal_id" text NOT NULL,
	"seq" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "eval_run" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"batch_internal_id" text NOT NULL,
	"variant_internal_id" text NOT NULL,
	"case_version_internal_id" text NOT NULL,
	"profile_internal_id" text,
	"harness_version" text NOT NULL,
	"harness_credential_connection_id" text,
	"harness_credential_revision" integer,
	"sandbox_credential_connection_id" text,
	"sandbox_credential_revision" integer,
	"trial_count" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "eval_suite" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eval_trial_artifact" (
	"trial_internal_id" text NOT NULL,
	"sha256" text NOT NULL,
	"path" text NOT NULL,
	"content" text NOT NULL,
	CONSTRAINT "eval_trial_artifact_trial_internal_id_path_pk" PRIMARY KEY("trial_internal_id","path")
);
--> statement-breakpoint
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
CREATE TABLE "eval_trial_journal" (
	"trial_internal_id" text PRIMARY KEY NOT NULL,
	"events" jsonb NOT NULL,
	"event_count" integer NOT NULL,
	"compacted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eval_trial" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"run_internal_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"status" text NOT NULL,
	"sandbox_id" text,
	"exit_code" integer,
	"command_count" integer,
	"model_ms" integer,
	"sandbox_ms" integer,
	"artifacts" jsonb,
	"validations" jsonb,
	"void_fields" jsonb,
	"verify_steps" jsonb,
	"usage" jsonb,
	"failure" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "eval_variant" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"case_internal_id" text NOT NULL,
	"harness" text NOT NULL,
	"model" text NOT NULL,
	"sandbox" text NOT NULL,
	"profile" text,
	"user_model" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "eval_variant_identity_key" UNIQUE NULLS NOT DISTINCT("case_internal_id","harness","model","sandbox","profile","user_model")
);
--> statement-breakpoint
ALTER TABLE "eval_batch" ADD CONSTRAINT "eval_batch_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_batch" ADD CONSTRAINT "eval_batch_started_by_user_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_case_version" ADD CONSTRAINT "eval_case_version_case_internal_id_eval_case_internal_id_fk" FOREIGN KEY ("case_internal_id") REFERENCES "public"."eval_case"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_case_version" ADD CONSTRAINT "eval_case_version_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_case" ADD CONSTRAINT "eval_case_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_case" ADD CONSTRAINT "eval_case_suite_internal_id_eval_suite_internal_id_fk" FOREIGN KEY ("suite_internal_id") REFERENCES "public"."eval_suite"("internal_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_event" ADD CONSTRAINT "eval_event_trial_internal_id_eval_trial_internal_id_fk" FOREIGN KEY ("trial_internal_id") REFERENCES "public"."eval_trial"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_harness_profile" ADD CONSTRAINT "eval_harness_profile_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_run" ADD CONSTRAINT "eval_run_batch_internal_id_eval_batch_internal_id_fk" FOREIGN KEY ("batch_internal_id") REFERENCES "public"."eval_batch"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_run" ADD CONSTRAINT "eval_run_variant_internal_id_eval_variant_internal_id_fk" FOREIGN KEY ("variant_internal_id") REFERENCES "public"."eval_variant"("internal_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_run" ADD CONSTRAINT "eval_run_case_version_internal_id_eval_case_version_internal_id_fk" FOREIGN KEY ("case_version_internal_id") REFERENCES "public"."eval_case_version"("internal_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_run" ADD CONSTRAINT "eval_run_profile_internal_id_eval_harness_profile_internal_id_fk" FOREIGN KEY ("profile_internal_id") REFERENCES "public"."eval_harness_profile"("internal_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_run" ADD CONSTRAINT "eval_run_harness_credential_connection_id_credential_connection_id_fk" FOREIGN KEY ("harness_credential_connection_id") REFERENCES "public"."credential_connection"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_run" ADD CONSTRAINT "eval_run_sandbox_credential_connection_id_credential_connection_id_fk" FOREIGN KEY ("sandbox_credential_connection_id") REFERENCES "public"."credential_connection"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_suite" ADD CONSTRAINT "eval_suite_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_trial_artifact" ADD CONSTRAINT "eval_trial_artifact_trial_internal_id_eval_trial_internal_id_fk" FOREIGN KEY ("trial_internal_id") REFERENCES "public"."eval_trial"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_trial_cost" ADD CONSTRAINT "eval_trial_cost_trial_internal_id_eval_trial_internal_id_fk" FOREIGN KEY ("trial_internal_id") REFERENCES "public"."eval_trial"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_trial_journal" ADD CONSTRAINT "eval_trial_journal_trial_internal_id_eval_trial_internal_id_fk" FOREIGN KEY ("trial_internal_id") REFERENCES "public"."eval_trial"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_trial" ADD CONSTRAINT "eval_trial_run_internal_id_eval_run_internal_id_fk" FOREIGN KEY ("run_internal_id") REFERENCES "public"."eval_run"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_variant" ADD CONSTRAINT "eval_variant_case_internal_id_eval_case_internal_id_fk" FOREIGN KEY ("case_internal_id") REFERENCES "public"."eval_case"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eval_batch_started_by_idx" ON "eval_batch" USING btree ("started_by");--> statement-breakpoint
CREATE INDEX "eval_batch_organization_id_created_at_idx" ON "eval_batch" USING btree ("organization_id","created_at" DESC NULLS LAST,"internal_id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "eval_case_version_case_internal_id_definition_hash_idx" ON "eval_case_version" USING btree ("case_internal_id","definition_hash");--> statement-breakpoint
CREATE INDEX "eval_case_version_created_by_idx" ON "eval_case_version" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "eval_case_organization_id_id_idx" ON "eval_case" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "eval_case_suite_internal_id_idx" ON "eval_case" USING btree ("suite_internal_id");--> statement-breakpoint
CREATE INDEX "eval_case_organization_id_created_at_idx" ON "eval_case" USING btree ("organization_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "eval_event_trial_internal_id_seq_idx" ON "eval_event" USING btree ("trial_internal_id","seq");--> statement-breakpoint
CREATE INDEX "eval_event_at_idx" ON "eval_event" USING btree ("at");--> statement-breakpoint
CREATE UNIQUE INDEX "eval_harness_profile_organization_id_name_version_idx" ON "eval_harness_profile" USING btree ("organization_id","name","version");--> statement-breakpoint
CREATE UNIQUE INDEX "eval_run_batch_internal_id_variant_internal_id_idx" ON "eval_run" USING btree ("batch_internal_id","variant_internal_id");--> statement-breakpoint
CREATE INDEX "eval_run_variant_internal_id_created_at_idx" ON "eval_run" USING btree ("variant_internal_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "eval_run_case_version_internal_id_idx" ON "eval_run" USING btree ("case_version_internal_id");--> statement-breakpoint
CREATE INDEX "eval_run_harness_credential_connection_id_idx" ON "eval_run" USING btree ("harness_credential_connection_id");--> statement-breakpoint
CREATE INDEX "eval_run_sandbox_credential_connection_id_idx" ON "eval_run" USING btree ("sandbox_credential_connection_id");--> statement-breakpoint
CREATE INDEX "eval_run_profile_internal_id_idx" ON "eval_run" USING btree ("profile_internal_id") WHERE "profile_internal_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "eval_suite_organization_id_id_idx" ON "eval_suite" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "eval_suite_organization_id_created_at_idx" ON "eval_suite" USING btree ("organization_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "eval_trial_cost_trial_component_idx" ON "eval_trial_cost" USING btree ("trial_internal_id","component");--> statement-breakpoint
CREATE UNIQUE INDEX "eval_trial_run_internal_id_ordinal_idx" ON "eval_trial" USING btree ("run_internal_id","ordinal");--> statement-breakpoint
CREATE INDEX "eval_trial_live_sandbox_idx" ON "eval_trial" USING btree ("started_at") WHERE sandbox_id is not null;--> statement-breakpoint
CREATE INDEX "eval_variant_case_internal_id_idx" ON "eval_variant" USING btree ("case_internal_id");