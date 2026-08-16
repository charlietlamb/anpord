CREATE TABLE "channel" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel" ADD CONSTRAINT "channel_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "channel_organization_id_name_idx" ON "channel" USING btree ("organization_id","name");
--> statement-breakpoint
CREATE INDEX "channel_organization_id_idx" ON "channel" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "prompt_channel" ADD COLUMN "channel_internal_id" text;
--> statement-breakpoint

INSERT INTO "channel" ("internal_id", "organization_id", "name", "color")
SELECT
	'chl_' || upper(
		translate(
			substr(
				md5(pairs."organization_id" || ':' || pairs."name" || ':' || gen_random_uuid()::text),
				1,
				24
			),
			'ilou',
			'JMPT'
		)
	),
	pairs."organization_id",
	pairs."name",
	CASE WHEN pairs."name" = 'production' THEN 'green' ELSE 'slate' END
FROM (
	SELECT DISTINCT p."organization_id", pc."name"
	FROM "prompt_channel" pc
	JOIN "prompt" p ON p."internal_id" = pc."prompt_internal_id"
) AS pairs
ON CONFLICT ("organization_id", "name") DO NOTHING;
--> statement-breakpoint

UPDATE "prompt_channel" pc
SET "channel_internal_id" = c."internal_id"
FROM "prompt" p, "channel" c
WHERE p."internal_id" = pc."prompt_internal_id"
	AND c."organization_id" = p."organization_id"
	AND c."name" = pc."name";
--> statement-breakpoint

ALTER TABLE "prompt_channel" ALTER COLUMN "channel_internal_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "prompt_channel" ADD CONSTRAINT "prompt_channel_channel_internal_id_channel_internal_id_fk" FOREIGN KEY ("channel_internal_id") REFERENCES "public"."channel"("internal_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
DROP INDEX "prompt_channel_prompt_internal_id_name_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_channel_prompt_internal_id_channel_idx" ON "prompt_channel" USING btree ("prompt_internal_id","channel_internal_id");
--> statement-breakpoint
ALTER TABLE "prompt_channel" DROP COLUMN "name";
