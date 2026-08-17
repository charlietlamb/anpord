CREATE TABLE "prompt_release" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"prompt_internal_id" text NOT NULL,
	"kind" text NOT NULL,
	"definition" jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_release_version" (
	"release_internal_id" text NOT NULL,
	"version_internal_id" text NOT NULL,
	CONSTRAINT "prompt_release_version_release_internal_id_version_internal_id_pk" PRIMARY KEY("release_internal_id","version_internal_id")
);
--> statement-breakpoint
ALTER TABLE "prompt_release" ADD CONSTRAINT "prompt_release_prompt_internal_id_prompt_internal_id_fk" FOREIGN KEY ("prompt_internal_id") REFERENCES "public"."prompt"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_release" ADD CONSTRAINT "prompt_release_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_release_version" ADD CONSTRAINT "prompt_release_version_release_internal_id_prompt_release_internal_id_fk" FOREIGN KEY ("release_internal_id") REFERENCES "public"."prompt_release"("internal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_release_version" ADD CONSTRAINT "prompt_release_version_version_internal_id_prompt_version_internal_id_fk" FOREIGN KEY ("version_internal_id") REFERENCES "public"."prompt_version"("internal_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prompt_release_prompt_internal_id_idx" ON "prompt_release" USING btree ("prompt_internal_id");--> statement-breakpoint

ALTER TABLE "prompt_channel" ADD COLUMN "release_internal_id" text;--> statement-breakpoint

-- One pinned release per existing placement, written and claimed in a single
-- statement so the two can never disagree.
--
-- Deriving the id from the placement's own id is what keeps them one-to-one:
-- two channels on one prompt may point at the same version, and matching a
-- release back to a placement by version would hand both the same release.
WITH "claimed" AS (
	SELECT
		pc."internal_id" AS "placement_id",
		'rel_' || upper(
			translate(
				substr(
					md5(pc."internal_id" || ':' || gen_random_uuid()::text),
					1, 24
				),
				'ilou', 'JMPT'
			)
		) AS "release_id",
		pc."prompt_internal_id",
		pv."version",
		pc."updated_by",
		pc."updated_at"
	FROM "prompt_channel" pc
	JOIN "prompt_version" pv ON pv."internal_id" = pc."version_internal_id"
), "written" AS (
	INSERT INTO "prompt_release" (
		"internal_id", "prompt_internal_id", "kind", "definition", "created_by", "created_at"
	)
	SELECT
		"release_id",
		"prompt_internal_id",
		'pinned',
		jsonb_build_object('_tag', 'Pinned', 'version', "version"),
		"updated_by",
		"updated_at"
	FROM "claimed"
	RETURNING "internal_id"
)
UPDATE "prompt_channel" pc
SET "release_internal_id" = c."release_id"
FROM "claimed" c
WHERE c."placement_id" = pc."internal_id";--> statement-breakpoint

INSERT INTO "prompt_release_version" ("release_internal_id", "version_internal_id")
SELECT pc."release_internal_id", pc."version_internal_id"
FROM "prompt_channel" pc
WHERE pc."release_internal_id" IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint

ALTER TABLE "prompt_channel" ALTER COLUMN "release_internal_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "prompt_channel" ADD CONSTRAINT "prompt_channel_release_internal_id_prompt_release_internal_id_fk" FOREIGN KEY ("release_internal_id") REFERENCES "public"."prompt_release"("internal_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

-- Nullable from here: a rollout serves two versions, so there is no single one
-- to denormalise. Existing rows all keep theirs.
ALTER TABLE "prompt_channel" ALTER COLUMN "version_internal_id" DROP NOT NULL;
