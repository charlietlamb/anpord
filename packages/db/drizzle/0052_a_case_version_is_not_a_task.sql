-- "Task" meant two unrelated things: this table, which is one version of what
-- a case contained, and the harness/model/sandbox a cell ran on, which the API
-- calls a task and the product calls a variant. The row keeps its identity and
-- its ids; only the words change.
ALTER TABLE "eval_task" RENAME TO "eval_case_version";
--> statement-breakpoint
ALTER TABLE "eval_cell" RENAME COLUMN "task_internal_id" TO "case_version_internal_id";
--> statement-breakpoint
ALTER TABLE "eval_case_version" RENAME CONSTRAINT "eval_task_case_internal_id_eval_case_internal_id_fk" TO "eval_case_version_case_internal_id_eval_case_internal_id_fk";
--> statement-breakpoint
ALTER TABLE "eval_case_version" RENAME CONSTRAINT "eval_task_organization_id_organization_id_fk" TO "eval_case_version_organization_id_organization_id_fk";
--> statement-breakpoint
ALTER TABLE "eval_case_version" RENAME CONSTRAINT "eval_task_created_by_user_id_fk" TO "eval_case_version_created_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "eval_case_version" RENAME CONSTRAINT "eval_task_source_kind_check" TO "eval_case_version_source_kind_check";
--> statement-breakpoint
-- Postgres truncates an identifier at 63 characters, so this one is shortened
-- by hand rather than left to be cut off mid-word.
ALTER TABLE "eval_cell" RENAME CONSTRAINT "eval_cell_task_internal_id_eval_task_internal_id_fk" TO "eval_cell_case_version_internal_id_fk";
--> statement-breakpoint
ALTER INDEX "eval_task_pkey" RENAME TO "eval_case_version_pkey";
--> statement-breakpoint
ALTER INDEX "eval_task_case_internal_id_definition_hash_idx" RENAME TO "eval_case_version_case_internal_id_definition_hash_idx";
--> statement-breakpoint
ALTER INDEX "eval_task_case_internal_id_idx" RENAME TO "eval_case_version_case_internal_id_idx";
--> statement-breakpoint
ALTER INDEX "eval_task_created_by_idx" RENAME TO "eval_case_version_created_by_idx";
--> statement-breakpoint
ALTER INDEX "eval_cell_task_internal_id_idx" RENAME TO "eval_cell_case_version_internal_id_idx";
