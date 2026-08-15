CREATE TABLE "prompt_channel_event" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"prompt_internal_id" text NOT NULL,
	"channel" text NOT NULL,
	"from_version_internal_id" text,
	"to_version_internal_id" text NOT NULL,
	"actor_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_channel" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"prompt_internal_id" text NOT NULL,
	"name" text NOT NULL,
	"version_internal_id" text NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_version" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"prompt_internal_id" text NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"commit_message" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"description" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "prompt_channel_event" ADD CONSTRAINT "prompt_channel_event_prompt_internal_id_prompt_internal_id_fk" FOREIGN KEY ("prompt_internal_id") REFERENCES "public"."prompt"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_channel_event" ADD CONSTRAINT "prompt_channel_event_from_version_internal_id_prompt_version_internal_id_fk" FOREIGN KEY ("from_version_internal_id") REFERENCES "public"."prompt_version"("internal_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_channel_event" ADD CONSTRAINT "prompt_channel_event_to_version_internal_id_prompt_version_internal_id_fk" FOREIGN KEY ("to_version_internal_id") REFERENCES "public"."prompt_version"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_channel_event" ADD CONSTRAINT "prompt_channel_event_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_channel" ADD CONSTRAINT "prompt_channel_prompt_internal_id_prompt_internal_id_fk" FOREIGN KEY ("prompt_internal_id") REFERENCES "public"."prompt"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_channel" ADD CONSTRAINT "prompt_channel_version_internal_id_prompt_version_internal_id_fk" FOREIGN KEY ("version_internal_id") REFERENCES "public"."prompt_version"("internal_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_channel" ADD CONSTRAINT "prompt_channel_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_version" ADD CONSTRAINT "prompt_version_prompt_internal_id_prompt_internal_id_fk" FOREIGN KEY ("prompt_internal_id") REFERENCES "public"."prompt"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_version" ADD CONSTRAINT "prompt_version_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt" ADD CONSTRAINT "prompt_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt" ADD CONSTRAINT "prompt_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prompt_channel_event_prompt_internal_id_idx" ON "prompt_channel_event" USING btree ("prompt_internal_id");--> statement-breakpoint
CREATE INDEX "prompt_channel_event_created_at_idx" ON "prompt_channel_event" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_channel_prompt_internal_id_name_idx" ON "prompt_channel" USING btree ("prompt_internal_id","name");--> statement-breakpoint
CREATE INDEX "prompt_channel_version_internal_id_idx" ON "prompt_channel" USING btree ("version_internal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_version_prompt_internal_id_version_idx" ON "prompt_version" USING btree ("prompt_internal_id","version");--> statement-breakpoint
CREATE INDEX "prompt_version_prompt_internal_id_idx" ON "prompt_version" USING btree ("prompt_internal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_organization_id_id_idx" ON "prompt" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "prompt_organization_id_idx" ON "prompt" USING btree ("organization_id");