-- The harness check from 0011 was never widened when harnesses were added, so
-- every harness but codex failed at cell insert. The wire schema is the
-- constraint; a list that has to be re-migrated per adapter is not.
ALTER TABLE "eval_cell" DROP CONSTRAINT IF EXISTS "eval_cell_harness_check";
--> statement-breakpoint
DROP INDEX "eval_baseline_organization_id_cell_key_idx";
--> statement-breakpoint
DROP INDEX "eval_cell_run_internal_id_cell_key_idx";
--> statement-breakpoint
-- The harness version leaves the cell key. A new release of the same harness is
-- the change a baseline exists to measure, so it is compared against the cell's
-- history rather than starting a new one. Joined with a newline, matching
-- cellKeyOf, because text cannot hold the NUL the old key was joined with.
UPDATE "eval_cell" c
SET "cell_key" = substr(encode(sha256(convert_to(
  t."id" || E'\n' || t."internal_id" || E'\n' || c."harness" || E'\n' || c."model" || E'\n' || c."provider",
  'UTF8')), 'hex'), 1, 32)
FROM "eval_task" t
WHERE t."internal_id" = c."task_internal_id";
--> statement-breakpoint
UPDATE "eval_baseline" b
SET "cell_key" = c."cell_key"
FROM "eval_cell" c
WHERE c."internal_id" = b."cell_internal_id";
--> statement-breakpoint
-- Where two versions of one harness each had a baseline, the older reading
-- keeps it: the first scored result is the rule, and the migration honours it.
DELETE FROM "eval_baseline"
WHERE "internal_id" NOT IN (
  SELECT DISTINCT ON ("organization_id", "cell_key") "internal_id"
  FROM "eval_baseline"
  ORDER BY "organization_id", "cell_key", "promoted_at" ASC
);
--> statement-breakpoint
CREATE UNIQUE INDEX "eval_baseline_organization_id_cell_key_idx" ON "eval_baseline" USING btree ("organization_id","cell_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "eval_cell_run_internal_id_cell_key_idx" ON "eval_cell" USING btree ("run_internal_id","cell_key");
