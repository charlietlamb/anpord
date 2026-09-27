import { Database } from "@anpord/db/client";
import type {
  EvalHome,
  EvalHomeDay,
  EvalHomeRange,
} from "@anpord/schema/domain/eval-home";
import { sql } from "drizzle-orm";
import { Clock, Duration, Effect } from "effect";
import { dollarsOf } from "../domain/cost-arithmetic";
import { batchReadsQuery } from "./batch-reads-query";
import { homeEvalsQuery } from "./home-evals-query";
import { tryStore } from "./query";

const RANGE_DAYS = {
  "30d": 30,
  "7d": 7,
  "90d": 90,
} satisfies Record<EvalHomeRange, number>;

const RECENT_BATCHES = 5;
const NEWLY_FAILING_WINDOW = Duration.hours(24);

interface DayRow extends Record<string, unknown> {
  readonly day: string;
  readonly passed: number;
  readonly scored: number;
  readonly suite_id: string;
  readonly variant: string;
}

const homeDaysSql = (organizationId: string, since: string) =>
  sql`
select to_char(date_trunc('day', batch.created_at), 'YYYY-MM-DD') as day,
  suite.id as suite_id,
  variant.harness || '/' || variant.model || coalesce('@' || variant.profile, '') as variant,
  count(*) filter (where trial.status = 'passed')::int as passed,
  count(*)::int as scored
from eval_batch batch
join eval_run run on run.batch_internal_id = batch.internal_id
join eval_variant variant on variant.internal_id = run.variant_internal_id
join eval_case c on c.internal_id = variant.case_internal_id
join eval_suite suite on suite.internal_id = c.suite_internal_id
join eval_trial trial on trial.run_internal_id = run.internal_id
where batch.organization_id = ${organizationId}
  and batch.created_at >= ${since}::timestamp
  and trial.status in ('passed', 'failed')
group by 1, 2, 3
order by 1, 2, 3`;

interface BatchNameRow extends Record<string, unknown> {
  readonly batch_id: string;
  readonly case_name: string;
  readonly cases: number;
  readonly suite_name: string;
  readonly suites: number;
}

const batchNamesSql = (organizationId: string, batchIds: readonly string[]) =>
  sql`
select batch.internal_id as batch_id,
  count(distinct c.internal_id)::int as cases,
  min(c.name) as case_name,
  count(distinct suite.internal_id)::int as suites,
  min(suite.name) as suite_name
from eval_batch batch
join eval_run run on run.batch_internal_id = batch.internal_id
join eval_variant variant on variant.internal_id = run.variant_internal_id
join eval_case c on c.internal_id = variant.case_internal_id
join eval_suite suite on suite.internal_id = c.suite_internal_id
where batch.organization_id = ${organizationId}
  and batch.internal_id in (${sql.join(
    batchIds.map((id) => sql`${id}`),
    sql`, `
  )})
group by batch.internal_id`;

const homeSpendSql = (organizationId: string, since: string) =>
  sql`
select coalesce(sum(cost.amount_nanos), 0)::text as nanos
from eval_batch batch
join eval_run run on run.batch_internal_id = batch.internal_id
join eval_trial trial on trial.run_internal_id = run.internal_id
join eval_trial_cost cost on cost.trial_internal_id = trial.internal_id
where batch.organization_id = ${organizationId}
  and batch.created_at >= ${since}::timestamp
  and cost.classification = 'estimate'`;

export const homeQuery = Effect.gen(function* () {
  const db = yield* Database;
  const batches = yield* batchReadsQuery;
  const evals = yield* homeEvalsQuery;

  return (input: {
    readonly organizationId: string;
    readonly range: EvalHomeRange;
  }) =>
    Effect.gen(function* () {
      const now = yield* Clock.currentTimeMillis;
      const since = new Date(
        now - Duration.toMillis(Duration.days(RANGE_DAYS[input.range]))
      ).toISOString();
      const failingSince = new Date(
        now - Duration.toMillis(NEWLY_FAILING_WINDOW)
      );

      const held = yield* Effect.all(
        {
          days: tryStore("home.days", () =>
            db.execute<DayRow>(homeDaysSql(input.organizationId, since))
          ),
          evals: evals(input.organizationId, failingSince),
          recent: batches.list({
            cursor: null,
            limit: RECENT_BATCHES,
            organizationId: input.organizationId,
          }),
          spend: tryStore("home.spend", () =>
            db.execute<{ readonly nanos: string }>(
              homeSpendSql(input.organizationId, since)
            )
          ),
        },
        { concurrency: "unbounded" }
      );

      const batchIds = held.recent.batches.map((batch) => batch.id);
      const names =
        batchIds.length === 0
          ? new Map<string, BatchNameRow>()
          : new Map(
              (yield* tryStore("home.batchNames", () =>
                db.execute<BatchNameRow>(
                  batchNamesSql(input.organizationId, batchIds)
                )
              )).rows.map((row) => [row.batch_id, row])
            );

      return {
        days: held.days.rows.map(
          (row): EvalHomeDay => ({
            day: row.day,
            passed: row.passed,
            scored: row.scored,
            suiteId: row.suite_id,
            variant: row.variant,
          })
        ),
        evals: held.evals,
        range: input.range,
        recentBatches: held.recent.batches.map((batch) => {
          const named = names.get(batch.id);
          return {
            batch,
            caseName: named?.cases === 1 ? named.case_name : null,
            suiteName: named?.suites === 1 ? named.suite_name : null,
            suites: named?.suites ?? 0,
          };
        }),
        spendUsd: dollarsOf(BigInt(held.spend.rows[0]?.nanos ?? "0")),
      } satisfies EvalHome;
    }).pipe(
      Effect.withSpan("HomeQuery.read", {
        attributes: { range: input.range },
      })
    );
});
