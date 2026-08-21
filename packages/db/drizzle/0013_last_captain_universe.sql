CREATE TABLE "prompt_event" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"prompt_internal_id" text NOT NULL,
	"kind" text NOT NULL,
	"version_internal_id" text,
	"actor_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prompt_event" ADD CONSTRAINT "prompt_event_prompt_internal_id_prompt_internal_id_fk" FOREIGN KEY ("prompt_internal_id") REFERENCES "public"."prompt"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_event" ADD CONSTRAINT "prompt_event_version_internal_id_prompt_version_internal_id_fk" FOREIGN KEY ("version_internal_id") REFERENCES "public"."prompt_version"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_event" ADD CONSTRAINT "prompt_event_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prompt_event_prompt_internal_id_idx" ON "prompt_event" USING btree ("prompt_internal_id");--> statement-breakpoint
CREATE INDEX "prompt_event_created_at_idx" ON "prompt_event" USING btree ("created_at");