CREATE TABLE "eval_playground" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"config" jsonb NOT NULL,
	"last_run_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "eval_playground" ADD CONSTRAINT "eval_playground_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_playground" ADD CONSTRAINT "eval_playground_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eval_playground_organization_id_id_idx" ON "eval_playground" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "eval_playground_organization_id_idx" ON "eval_playground" USING btree ("organization_id");