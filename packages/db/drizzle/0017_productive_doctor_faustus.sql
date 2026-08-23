ALTER TABLE "eval_cell" ADD COLUMN "prompt" text;
UPDATE "eval_cell"
SET "prompt" = "eval_task"."prompt"
FROM "eval_task"
WHERE "eval_cell"."task_internal_id" = "eval_task"."internal_id";
ALTER TABLE "eval_cell" ALTER COLUMN "prompt" SET NOT NULL;
