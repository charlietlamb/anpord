-- The reaper asked for trials whose status was still queued or running, so a
-- trial the reconciler had voided kept its sandbox id and dropped out of the
-- query in the same pass. Every VM those trials held became unreapable, and
-- billed until someone noticed by hand.
--
-- The sandbox id column is now what decides: a row holding one names a VM that
-- may still be running, whatever the trial's status says about the work. The
-- index follows the predicate, and leads on the timestamp the query orders by
-- rather than the status it no longer mentions.
DROP INDEX IF EXISTS "eval_trial_live_sandbox_idx";
--> statement-breakpoint
CREATE INDEX "eval_trial_live_sandbox_idx" ON "eval_trial" USING btree ("started_at") WHERE sandbox_id is not null;
