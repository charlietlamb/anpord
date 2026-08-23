ALTER TABLE "eval_cell" ADD COLUMN "harness_credential_connection_id" text;--> statement-breakpoint
ALTER TABLE "eval_cell" ADD COLUMN "harness_credential_revision" integer;--> statement-breakpoint
ALTER TABLE "eval_cell" ADD COLUMN "sandbox_credential_connection_id" text;--> statement-breakpoint
ALTER TABLE "eval_cell" ADD COLUMN "sandbox_credential_revision" integer;--> statement-breakpoint
ALTER TABLE "eval_cell" ADD CONSTRAINT "eval_cell_harness_credential_connection_id_credential_connection_id_fk" FOREIGN KEY ("harness_credential_connection_id") REFERENCES "public"."credential_connection"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_cell" ADD CONSTRAINT "eval_cell_sandbox_credential_connection_id_credential_connection_id_fk" FOREIGN KEY ("sandbox_credential_connection_id") REFERENCES "public"."credential_connection"("id") ON DELETE set null ON UPDATE no action;