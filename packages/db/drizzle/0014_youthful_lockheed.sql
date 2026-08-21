ALTER TABLE "prompt_event" DROP CONSTRAINT "prompt_event_version_internal_id_prompt_version_internal_id_fk";
--> statement-breakpoint
DROP INDEX "prompt_event_created_at_idx";--> statement-breakpoint
ALTER TABLE "prompt_event" ADD COLUMN "channel" text;--> statement-breakpoint
ALTER TABLE "prompt_event" ADD COLUMN "from_version_internal_id" text;--> statement-breakpoint
ALTER TABLE "prompt_event" ADD CONSTRAINT "prompt_event_from_version_internal_id_prompt_version_internal_id_fk" FOREIGN KEY ("from_version_internal_id") REFERENCES "public"."prompt_version"("internal_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_event" ADD CONSTRAINT "prompt_event_version_internal_id_prompt_version_internal_id_fk" FOREIGN KEY ("version_internal_id") REFERENCES "public"."prompt_version"("internal_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prompt_event_created_at_internal_id_idx" ON "prompt_event" USING btree ("created_at","internal_id");--> statement-breakpoint

--> Carried over before the table is dropped: the channel moves already recorded
--> are the history this log exists to hold, and dropping them would lose the
--> record of every deployment made so far.
INSERT INTO "prompt_event" (
  "internal_id",
  "prompt_internal_id",
  "kind",
  "version_internal_id",
  "channel",
  "from_version_internal_id",
  "actor_id",
  "created_at"
)
SELECT
  "internal_id",
  "prompt_internal_id",
  'deployed',
  "to_version_internal_id",
  "channel",
  "from_version_internal_id",
  "actor_id",
  "created_at"
FROM "prompt_channel_event";--> statement-breakpoint

--> Every version that exists was saved by someone, and the log should say so
--> from the beginning rather than only from this migration forward.
INSERT INTO "prompt_event" (
  "internal_id",
  "prompt_internal_id",
  "kind",
  "version_internal_id",
  "actor_id",
  "created_at"
)
SELECT
  'pev_' || substr(md5("internal_id"), 1, 24),
  "prompt_internal_id",
  'saved',
  "internal_id",
  "created_by",
  "created_at"
FROM "prompt_version";--> statement-breakpoint

ALTER TABLE "prompt_channel_event" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "prompt_channel_event" CASCADE;
