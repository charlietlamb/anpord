-- Stamped on every finish and never read back; the status the same update
-- writes is what every caller actually asks about.
ALTER TABLE "credential_auth_attempt" DROP COLUMN IF EXISTS "completed_at";
--> statement-breakpoint
-- Verification already moves "status" between active and invalid, which is the
-- part the API renders. The timestamp reached the wire but nothing displayed it.
ALTER TABLE "credential_connection" DROP COLUMN IF EXISTS "last_verified_at";
--> statement-breakpoint
-- Kept for an audit trail nothing ever queried. The installation belongs to the
-- organization, which is the association every read goes through.
DROP INDEX IF EXISTS "github_installation_installed_by_user_id_idx";
--> statement-breakpoint
ALTER TABLE "github_installation" DROP COLUMN IF EXISTS "installed_by_user_id";
--> statement-breakpoint
-- Incremented on every reopen and read by nothing but the test that asserted
-- the increment. A trial's history lives in its events.
ALTER TABLE "eval_trial" DROP COLUMN IF EXISTS "attempt";
--> statement-breakpoint
-- Selected into a Baseline value that no caller reached for. Promotion order is
-- already recoverable from the row's own creation.
ALTER TABLE "eval_baseline" DROP COLUMN IF EXISTS "promoted_at";
--> statement-breakpoint
-- Written by no code path at all.
ALTER TABLE "eval_task" DROP COLUMN IF EXISTS "bracketed_at";
--> statement-breakpoint
-- Four queries filtered on it and nothing ever set it, so archiving was
-- unreachable. Dropped rather than left as a filter that can only ever pass.
ALTER TABLE "eval_task" DROP COLUMN IF EXISTS "archived_at";
--> statement-breakpoint
ALTER TABLE "eval_playground" DROP COLUMN IF EXISTS "archived_at";
