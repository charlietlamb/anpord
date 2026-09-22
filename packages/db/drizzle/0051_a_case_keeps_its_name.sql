-- A case gets a row of its own. Until now "which case is this" was answered by
-- a hash of what the case contained, so editing a validator minted a new case,
-- orphaned its baseline, and left the old one in the list beside it.
CREATE TABLE "eval_case" (
	"internal_id" text PRIMARY KEY NOT NULL,
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eval_case" ADD CONSTRAINT "eval_case_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- One case per distinct name in an organization: the same grouping the case
-- list already folded on, so the screen keeps showing what it shows today.
-- Named from the oldest task carrying the name, so an edit does not rename it.
INSERT INTO "eval_case" ("internal_id", "id", "organization_id", "name", "created_at")
SELECT
  'ecas_' || upper(substr(encode(sha256(convert_to(t."organization_id" || E'\n' || t."name", 'UTF8')), 'hex'), 1, 26)),
  CASE
    WHEN nullif(regexp_replace(regexp_replace(lower(t."name"), '[^a-z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'), '') IS NULL
      THEN 'case-' || substr(encode(sha256(convert_to(t."name", 'UTF8')), 'hex'), 1, 8)
    ELSE
      left(regexp_replace(regexp_replace(lower(t."name"), '[^a-z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'), 100)
      -- Two names slugging alike would collide on the unique index, so every id
      -- carries a short digest of the name it came from.
      || '-' || substr(encode(sha256(convert_to(t."name", 'UTF8')), 'hex'), 1, 6)
  END,
  t."organization_id",
  t."name",
  min(t."created_at")
FROM "eval_task" t
GROUP BY t."organization_id", t."name";
--> statement-breakpoint
CREATE UNIQUE INDEX "eval_case_organization_id_id_idx" ON "eval_case" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "eval_case_organization_id_created_at_idx" ON "eval_case" USING btree ("organization_id","created_at" DESC NULLS LAST);
--> statement-breakpoint
-- The task becomes a version of its case. Its old `id` was already the hash of
-- what the definition contained, which is exactly what a version is, so it is
-- renamed in place rather than recomputed.
ALTER TABLE "eval_task" RENAME COLUMN "id" TO "definition_hash";
--> statement-breakpoint
ALTER TABLE "eval_task" ADD COLUMN "case_internal_id" text;
--> statement-breakpoint
UPDATE "eval_task" t
SET "case_internal_id" = c."internal_id"
FROM "eval_case" c
WHERE c."organization_id" = t."organization_id" AND c."name" = t."name";
--> statement-breakpoint
ALTER TABLE "eval_task" ALTER COLUMN "case_internal_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "eval_task" ADD CONSTRAINT "eval_task_case_internal_id_eval_case_internal_id_fk" FOREIGN KEY ("case_internal_id") REFERENCES "public"."eval_case"("internal_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
DROP INDEX "eval_task_organization_id_id_idx";
--> statement-breakpoint
-- Two task rows under one case could hold the same definition only if they
-- differed by a field the old hash ignored, which none did; the unique index
-- below would still reject them, so collapse them first and move their cells.
UPDATE "eval_cell" c
SET "task_internal_id" = keep."internal_id"
FROM "eval_task" dup
JOIN LATERAL (
  SELECT t2."internal_id"
  FROM "eval_task" t2
  WHERE t2."case_internal_id" = dup."case_internal_id"
    AND t2."definition_hash" = dup."definition_hash"
  ORDER BY t2."created_at" ASC, t2."internal_id" ASC
  LIMIT 1
) keep ON true
WHERE c."task_internal_id" = dup."internal_id"
  AND keep."internal_id" <> dup."internal_id";
--> statement-breakpoint
DELETE FROM "eval_task" t
WHERE t."internal_id" NOT IN (
  SELECT DISTINCT ON ("case_internal_id", "definition_hash") "internal_id"
  FROM "eval_task"
  ORDER BY "case_internal_id", "definition_hash", "created_at" ASC, "internal_id" ASC
);
--> statement-breakpoint
CREATE UNIQUE INDEX "eval_task_case_internal_id_definition_hash_idx" ON "eval_task" USING btree ("case_internal_id","definition_hash");
--> statement-breakpoint
CREATE INDEX "eval_task_case_internal_id_idx" ON "eval_task" USING btree ("case_internal_id");
--> statement-breakpoint
DROP INDEX "eval_baseline_organization_id_cell_key_idx";
--> statement-breakpoint
DROP INDEX "eval_cell_run_internal_id_cell_key_idx";
--> statement-breakpoint
-- Kept for one release: a key is quoted in the public API, and a reader who
-- stored one needs somewhere to look it up when it stops resolving.
ALTER TABLE "eval_cell" ADD COLUMN "legacy_cell_key" text;
--> statement-breakpoint
UPDATE "eval_cell" SET "legacy_cell_key" = "cell_key";
--> statement-breakpoint
-- The case replaces the task and its version in the key, so every reading of
-- one case now shares a key whatever edits happened between them. Newline
-- joined, profile fourth and user model fifth only when present, matching
-- cellKeyOf. The user model is not stored on the cell, so it is read back from
-- the task's simulated user exactly as userModelOf derives it.
UPDATE "eval_cell" c
SET "cell_key" = substr(encode(sha256(convert_to(
  t."case_internal_id"
  || E'\n' || c."harness"
  || E'\n' || c."model"
  || E'\n' || c."provider"
  || coalesce(E'\n' || (
       SELECT p."name" FROM "eval_harness_profile" p
       WHERE p."internal_id" = c."profile_internal_id"
     ), '')
  || CASE WHEN t."user" ->> 'kind' = 'simulated'
       THEN E'\n' || coalesce(nullif(current_setting('anpord.user_model', true), ''), 'gpt-5.4-mini')
       ELSE '' END,
  'UTF8')), 'hex'), 1, 32)
FROM "eval_task" t
WHERE t."internal_id" = c."task_internal_id";
--> statement-breakpoint
UPDATE "eval_baseline" b
SET "cell_key" = c."cell_key"
FROM "eval_cell" c
WHERE c."internal_id" = b."cell_internal_id";
--> statement-breakpoint
-- Collapsing the version out of the key merges baselines that were separate
-- only because the definition had been edited. The earliest reading keeps it:
-- the first scored result is the rule. promoted_at went in 0038, so the cell's
-- own created_at orders them.
DELETE FROM "eval_baseline"
WHERE "internal_id" NOT IN (
  SELECT DISTINCT ON (b."organization_id", b."cell_key") b."internal_id"
  FROM "eval_baseline" b
  JOIN "eval_cell" c ON c."internal_id" = b."cell_internal_id"
  ORDER BY b."organization_id", b."cell_key", c."created_at" ASC, b."internal_id" ASC
);
--> statement-breakpoint
-- Two cells in one run can now share a key where they differed only by the
-- version of the case they ran. Keep the newest, because it is the reading the
-- run's own screen already scores, and move its trials onto it.
UPDATE "eval_trial" tr
SET "cell_internal_id" = keep."internal_id"
FROM "eval_cell" dup
JOIN LATERAL (
  SELECT c2."internal_id"
  FROM "eval_cell" c2
  WHERE c2."run_internal_id" = dup."run_internal_id"
    AND c2."cell_key" = dup."cell_key"
  ORDER BY c2."created_at" DESC, c2."internal_id" DESC
  LIMIT 1
) keep ON true
WHERE tr."cell_internal_id" = dup."internal_id"
  AND keep."internal_id" <> dup."internal_id";
--> statement-breakpoint
UPDATE "eval_baseline" b
SET "cell_internal_id" = keep."internal_id"
FROM "eval_cell" dup
JOIN LATERAL (
  SELECT c2."internal_id"
  FROM "eval_cell" c2
  WHERE c2."run_internal_id" = dup."run_internal_id"
    AND c2."cell_key" = dup."cell_key"
  ORDER BY c2."created_at" DESC, c2."internal_id" DESC
  LIMIT 1
) keep ON true
WHERE b."cell_internal_id" = dup."internal_id"
  AND keep."internal_id" <> dup."internal_id";
--> statement-breakpoint
DELETE FROM "eval_cell" c
WHERE c."internal_id" NOT IN (
  SELECT DISTINCT ON ("run_internal_id", "cell_key") "internal_id"
  FROM "eval_cell"
  ORDER BY "run_internal_id", "cell_key", "created_at" DESC, "internal_id" DESC
);
--> statement-breakpoint
CREATE UNIQUE INDEX "eval_baseline_organization_id_cell_key_idx" ON "eval_baseline" USING btree ("organization_id","cell_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "eval_cell_run_internal_id_cell_key_idx" ON "eval_cell" USING btree ("run_internal_id","cell_key");
