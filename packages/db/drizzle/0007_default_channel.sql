ALTER TABLE "channel" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;
--> statement-breakpoint

-- Partial, so an organisation may hold one default or none at all.
CREATE UNIQUE INDEX "channel_one_default_idx" ON "channel" USING btree ("organization_id") WHERE "channel"."is_default";
--> statement-breakpoint

-- Every organisation already answers a bare request from `production`, so that
-- channel becomes the default and nothing changes for callers.
UPDATE "channel" SET "is_default" = true WHERE "name" = 'production';
