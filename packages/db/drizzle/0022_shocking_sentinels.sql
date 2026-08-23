CREATE TABLE "credential_auth_attempt" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"integration_id" text NOT NULL,
	"auth_method_id" text NOT NULL,
	"status" text NOT NULL,
	"sealed_state" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "credential_connection" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"integration_id" text NOT NULL,
	"auth_method_id" text NOT NULL,
	"scope" text NOT NULL,
	"owner_user_id" text,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"sealed_payload" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_verified_at" timestamp,
	"last_used_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "credential_auth_attempt" ADD CONSTRAINT "credential_auth_attempt_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_auth_attempt" ADD CONSTRAINT "credential_auth_attempt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_connection" ADD CONSTRAINT "credential_connection_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_connection" ADD CONSTRAINT "credential_connection_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_connection" ADD CONSTRAINT "credential_connection_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credential_auth_attempt_organization_user_status_idx" ON "credential_auth_attempt" USING btree ("organization_id","user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "credential_connection_organization_integration_name_idx" ON "credential_connection" USING btree ("organization_id","integration_id","name");--> statement-breakpoint
CREATE INDEX "credential_connection_organization_integration_status_idx" ON "credential_connection" USING btree ("organization_id","integration_id","status");