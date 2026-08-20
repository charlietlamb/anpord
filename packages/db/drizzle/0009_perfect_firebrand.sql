CREATE TABLE "eval_baseline" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"cell_key" text NOT NULL,
	"cell_internal_id" text NOT NULL,
	"promoted_by" text,
	"promoted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eval_baseline" ADD CONSTRAINT "eval_baseline_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_baseline" ADD CONSTRAINT "eval_baseline_cell_internal_id_eval_cell_internal_id_fk" FOREIGN KEY ("cell_internal_id") REFERENCES "public"."eval_cell"("internal_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_baseline" ADD CONSTRAINT "eval_baseline_promoted_by_user_id_fk" FOREIGN KEY ("promoted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "eval_baseline_organization_id_cell_key_idx" ON "eval_baseline" USING btree ("organization_id","cell_key");--> statement-breakpoint
CREATE INDEX "eval_baseline_organization_id_idx" ON "eval_baseline" USING btree ("organization_id");