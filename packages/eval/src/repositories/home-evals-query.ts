import { Database } from "@anpord/db/client";
import type {
  EvalHomeEval,
  EvalHomeVerdict,
} from "@anpord/schema/domain/eval-home";
import { sql } from "drizzle-orm";
import { DateTime, Effect, Option } from "effect";
import { unscoredReasonOf } from "../domain/unscored-reason";
import { tryStore } from "./query";
import { variantOf } from "./run-view";

interface EvalRow extends Record<string, unknown> {
  readonly case_id: string;
  readonly case_name: string;
  readonly failure_check: string | null;
  readonly failure_message: string | null;
  readonly finished_at_ms: number;
  readonly newly_failing: boolean;
  readonly passed: number;
  readonly run_id: string;
  readonly scored: number;
  readonly suite_id: string;
  readonly suite_name: string;
  readonly unscored_failure: string | null;
  readonly variant_harness: string;
  readonly variant_id: string;
  readonly variant_model: string;
  readonly variant_profile: string | null;
  readonly variant_sandbox: string;
  readonly variant_user_model: string | null;
  readonly verdict: EvalHomeVerdict;
}

const homeEvalsSql = (organizationId: string, failingSince: string) =>
  sql`
with scoped as (
  select c.id as case_id, c.name as case_name, s.id as suite_id, s.name as suite_name,
    v.internal_id as variant_id, v.harness as variant_harness, v.model as variant_model,
    v.sandbox as variant_sandbox, v.profile as variant_profile,
    v.user_model as variant_user_model
  from eval_case c
  join eval_suite s on s.internal_id = c.suite_internal_id
    and s.organization_id = ${organizationId}
  join eval_variant v on v.case_internal_id = c.internal_id
  where c.organization_id = ${organizationId}
),
judged as (
  select scoped.*, r.run_id, r.finished_at, r.position, tally.passed,
    tally.passed + tally.failed as scored,
    case
      when tally.passed + tally.failed = 0 then 'unscored'
      when tally.failed = 0 then 'passed'
      when tally.passed = 0 then 'failed'
      else 'flaky'
    end as verdict
  from scoped
  cross join lateral (
    select run.internal_id as run_id,
      coalesce(run.finished_at, run.created_at) as finished_at,
      row_number() over (order by run.created_at desc, run.internal_id desc) as position
    from eval_run run
    join eval_batch batch on batch.internal_id = run.batch_internal_id
      and batch.organization_id = ${organizationId}
    where run.variant_internal_id = scoped.variant_id and run.status <> 'running'
    order by run.created_at desc, run.internal_id desc
    limit 2
  ) r
  cross join lateral (
    select count(*) filter (where trial.status = 'passed')::int as passed,
      count(*) filter (where trial.status = 'failed')::int as failed
    from eval_trial trial
    where trial.run_internal_id = r.run_id
  ) tally
),
paired as (
  select judged.*,
    lead(verdict) over (partition by variant_id order by position) as previous_verdict
  from judged
)
select newest.case_id, newest.case_name, newest.suite_id, newest.suite_name,
  newest.variant_id, newest.variant_harness, newest.variant_model,
  newest.variant_sandbox, newest.variant_profile, newest.variant_user_model,
  newest.run_id, newest.passed, newest.scored, newest.verdict,
  (extract(epoch from newest.finished_at) * 1000)::float8 as finished_at_ms,
  (
    newest.verdict in ('failed', 'flaky')
    and newest.finished_at >= ${failingSince}::timestamp
    and (newest.previous_verdict is null or newest.previous_verdict = 'passed')
  ) as newly_failing,
  failure.check_name as failure_check, failure.message as failure_message,
  unscored.failure as unscored_failure
from paired newest
left join lateral (
  select coalesce(check_row.value ->> 'name', 'verify') as check_name,
    case when check_row.value is null then trial.failure
      else check_row.value ->> 'message' end as message
  from eval_trial trial
  left join lateral (
    select entry.value
    from jsonb_array_elements(
      case when jsonb_typeof(trial.validations) = 'array'
        then trial.validations else '[]'::jsonb end
    ) with ordinality as entry(value, place)
    where entry.value ->> 'status' in ('failed', 'error')
    order by entry.place
    limit 1
  ) check_row on true
  where trial.run_internal_id = newest.run_id and trial.status = 'failed'
  order by check_row.value is null, trial.ordinal
  limit 1
) failure on newest.verdict in ('failed', 'flaky')
left join lateral (
  select trial.failure
  from eval_trial trial
  where trial.run_internal_id = newest.run_id and trial.status = 'void'
  order by trial.ordinal
  limit 1
) unscored on newest.verdict = 'unscored'
where newest.position = 1
order by newest.suite_id, newest.case_id, newest.variant_id`;

const evalOf = (row: EvalRow) =>
  Option.map(
    variantOf({
      harness: row.variant_harness,
      internalId: row.variant_id,
      model: row.variant_model,
      profile: row.variant_profile,
      sandbox: row.variant_sandbox,
      userModel: row.variant_user_model,
    }),
    (variant): EvalHomeEval => ({
      caseId: row.case_id,
      caseName: row.case_name,
      failure:
        row.failure_check === null
          ? null
          : { check: row.failure_check, message: row.failure_message },
      finishedAt: DateTime.unsafeMake(row.finished_at_ms),
      newlyFailing: row.newly_failing,
      passed: row.passed,
      runId: row.run_id,
      scored: row.scored,
      suite: { id: row.suite_id, name: row.suite_name },
      unscoredReason:
        row.verdict === "unscored"
          ? unscoredReasonOf(row.unscored_failure)
          : null,
      variant,
      verdict: row.verdict,
    })
  );

export const homeEvalsQuery = Effect.gen(function* () {
  const db = yield* Database;

  return (organizationId: string, failingSince: Date) =>
    tryStore("home.evals", () =>
      db.execute<EvalRow>(
        homeEvalsSql(organizationId, failingSince.toISOString())
      )
    ).pipe(
      Effect.map((result) =>
        result.rows.flatMap((row) => Option.toArray(evalOf(row)))
      )
    );
});
