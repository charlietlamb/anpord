CREATE TABLE "environment_variable" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"scope" text NOT NULL,
	"owner_user_id" text,
	"name" text NOT NULL,
	"secret" boolean DEFAULT true NOT NULL,
	"sealed_value" text NOT NULL,
	"preview" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "eval_run" DROP CONSTRAINT "eval_run_harness_credential_connection_id_credential_connection_id_fk";
--> statement-breakpoint
ALTER TABLE "eval_run" DROP CONSTRAINT "eval_run_sandbox_credential_connection_id_credential_connection_id_fk";
--> statement-breakpoint
ALTER TABLE "eval_harness_profile" ADD COLUMN "variables" jsonb;--> statement-breakpoint
ALTER TABLE "environment_variable" ADD CONSTRAINT "environment_variable_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environment_variable" ADD CONSTRAINT "environment_variable_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environment_variable" ADD CONSTRAINT "environment_variable_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "environment_variable_created_by_idx" ON "environment_variable" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "environment_variable_owner_user_id_idx" ON "environment_variable" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "environment_variable_organization_name_idx" ON "environment_variable" USING btree ("organization_id","name") WHERE "environment_variable"."scope" = 'organization';--> statement-breakpoint
CREATE UNIQUE INDEX "environment_variable_personal_name_idx" ON "environment_variable" USING btree ("organization_id","owner_user_id","name") WHERE "environment_variable"."scope" = 'personal';