# Home read: EXPLAIN (ANALYZE, BUFFERS)

Database: local `anpord_dev`, org `home-demo` (`org_home_demo`) seeded by `/tmp/pstack-home/seed-home.ts`: 5 suites, 160 cases, 480 variants, 540 batches over 90 days, 4,356 runs, 17,424 trials, 33,414 cost rows. Whole table sizes include ~240 other trials. Plans captured by `/tmp/pstack-home/explain-home.ts`, which runs the real `homeQuery` through a recording pg pool, then runs each captured statement 7 times and once under EXPLAIN. Timings are medians of client round trips, warm cache. The summary table is from the final seed; the self join baseline and the candidate index runs were taken on the first seed (17,280 trials, same shape).

## Summary (final SQL, no new indexes)

| Query | 7d | 90d | Access path |
|---|---|---|---|
| evals (newest settled run per case x variant) | 22.8ms | 22.9ms | index scans: eval_case suite idx, eval_variant case idx, eval_run (variant, created_at desc) bitmap + tiny per-variant sort, eval_trial (run, ordinal) |
| days (trials per UTC day x suite x variant) | 5.1ms | 24.9ms | 7d: eval_batch filter then eval_trial (run, ordinal) index. 90d: hash joins over whole tables, since it reads 95% of trials |
| spend (estimate nanos summed) | 6.4ms | 12.2ms | 7d: trial index lookups, hash join with eval_trial_cost. 90d: hash joins |
| recent batches (existing batchReads.list: page, tallies, total) | 0.2 + 1.4 + 0.2ms | same | eval_batch (tiny), eval_run (batch, variant) unique idx, eval_trial (run, ordinal) |
| End to end, all concurrent (pool of 8) | 24.7ms | 26.1ms | |

Range only changes `days` and `spend`. `evals` is O(variants), independent of history length.

## What changed because of these plans

1. The first evals query joined the `judged` CTE to itself to find each variant's previous run. The planner estimated 4 rows per CTE scan and chose a nested loop: `Rows Removed by Join Filter: 212400`, 50.3ms execution, 50.9ms end to end at 90d. Replaced with `lead(verdict) over (partition by variant_id order by position)`: evals 50.3ms to 18.2ms, end to end 50.9ms to 26.6ms on the same data. Commit 3f3b93d9. Baseline plan in the appendix.

## Candidate indexes, tested and rejected

Created on anpord_dev, ANALYZEd, re-explained, then dropped. Plans in the appendix ("candidates").

- `eval_run (variant_internal_id, created_at desc, internal_id desc)`. Alone (applied as migration 0060 on a scratch clone), the planner kept the bitmap scan plus per-variant sort: evals 21.0ms before, 19.7ms after at 7d, same plan shape. It only switched to an index scan together with the trial index below. Not added. At a larger history per variant the existing `(variant_internal_id, created_at desc)` index already supports an incremental sort under `limit 2` (inferred, not measured).
- `eval_trial (run_internal_id, status)`. Turns the per-run tallies into index-only scans: evals 19.1ms to 15.4ms (7d), days 90d unchanged (26.6ms vs 26.7ms, seq scan became a full index-only scan). No seq scan or sort removed, and indexing `status` on the hottest-updated table stops HOT updates on every trial status change. Not added.
- `eval_trial_cost (trial_internal_id, classification)`. Never chosen by the planner. Not added.

No migration.

## Denormalizing organization_id or a rollup table

Not done. The whole read is 25 to 26ms end to end at 17k trials. The only range-sensitive queries (days, spend) are 26ms and 12ms at the full 90 days. A rollup table would need write-path maintenance on every trial settle to save roughly 30ms. Scaling guess (not measured): days and spend grow linearly with trials in range, so ~10x the data would put 90d near 250ms, which is the point to revisit a per-day rollup.

# Appendix A: final plans, 7d

## Range 7d, organization org_home_demo

End to end (all queries concurrently, pool of 8), median of 7: 24.7ms

### `select to_char(date_trunc('day', batch.created_at), 'YYYY-MM-DD') as day,`

Median client round trip over 7 runs: 5.1ms

```sql
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
where batch.organization_id = $1
  and batch.created_at >= $2::timestamp
  and trial.status in ('passed', 'failed')
group by 1, 2, 3
order by 1, 2, 3
```

Params: ["org_home_demo","2026-09-20T15:56:57.348Z"]

```
GroupAggregate  (cost=5606.98..5740.40 rows=2809 width=89) (actual time=4.779..4.980 rows=96.00 loops=1)
  Group Key: (to_char(date_trunc('day'::text, batch.created_at), 'YYYY-MM-DD'::text)), suite.id, ((((variant.harness || '/'::text) || variant.model) || COALESCE(('@'::text || variant.profile), ''::text)))
  Buffers: shared hit=3046
  ->  Sort  (cost=5606.98..5614.00 rows=2809 width=87) (actual time=4.772..4.804 rows=1409.00 loops=1)
        Sort Key: (to_char(date_trunc('day'::text, batch.created_at), 'YYYY-MM-DD'::text)), suite.id, ((((variant.harness || '/'::text) || variant.model) || COALESCE(('@'::text || variant.profile), ''::text)))
        Sort Method: quicksort  Memory: 146kB
        Buffers: shared hit=3046
        ->  Nested Loop  (cost=92.38..5446.08 rows=2809 width=87) (actual time=0.556..3.349 rows=1409.00 loops=1)
              Buffers: shared hit=3046
              ->  Hash Join  (cost=91.97..460.68 rows=755 width=82) (actual time=0.546..0.758 rows=372.00 loops=1)
                    Hash Cond: (c.suite_internal_id = suite.internal_id)
                    Buffers: shared hit=367
                    ->  Hash Join  (cost=90.02..456.55 rows=755 width=90) (actual time=0.536..0.708 rows=372.00 loops=1)
                          Hash Cond: (variant.case_internal_id = c.internal_id)
                          Buffers: shared hit=366
                          ->  Hash Join  (cost=75.07..439.59 rows=755 width=91) (actual time=0.506..0.630 rows=372.00 loops=1)
                                Hash Cond: (run.variant_internal_id = variant.internal_id)
                                Buffers: shared hit=356
                                ->  Hash Join  (cost=37.91..400.43 rows=755 width=74) (actual time=0.419..0.481 rows=372.00 loops=1)
                                      Hash Cond: (run.batch_internal_id = batch.internal_id)
                                      Buffers: shared hit=332
                                      ->  Seq Scan on eval_run run  (cost=0.00..350.50 rows=4550 width=81) (actual time=0.001..0.189 rows=4550.00 loops=1)
                                            Buffers: shared hit=305
                                      ->  Hash  (cost=36.59..36.59 rows=106 width=25) (actual time=0.036..0.036 rows=42.00 loops=1)
                                            Buckets: 1024  Batches: 1  Memory Usage: 11kB
                                            Buffers: shared hit=27
                                            ->  Seq Scan on eval_batch batch  (cost=0.00..36.59 rows=106 width=25) (actual time=0.031..0.033 rows=42.00 loops=1)
                                                  Filter: ((created_at >= '2026-09-20 15:56:57.348'::timestamp without time zone) AND (organization_id = 'org_home_demo'::text))
                                                  Rows Removed by Filter: 597
                                                  Buffers: shared hit=27
                                ->  Hash  (cost=29.85..29.85 rows=585 width=79) (actual time=0.087..0.087 rows=585.00 loops=1)
                                      Buckets: 1024  Batches: 1  Memory Usage: 70kB
                                      Buffers: shared hit=24
                                      ->  Seq Scan on eval_variant variant  (cost=0.00..29.85 rows=585 width=79) (actual time=0.002..0.038 rows=585.00 loops=1)
                                            Buffers: shared hit=24
                          ->  Hash  (cost=12.20..12.20 rows=220 width=52) (actual time=0.029..0.029 rows=220.00 loops=1)
                                Buckets: 1024  Batches: 1  Memory Usage: 27kB
                                Buffers: shared hit=10
                                ->  Seq Scan on eval_case c  (cost=0.00..12.20 rows=220 width=52) (actual time=0.002..0.016 rows=220.00 loops=1)
                                      Buffers: shared hit=10
                    ->  Hash  (cost=1.42..1.42 rows=42 width=45) (actual time=0.008..0.009 rows=42.00 loops=1)
                          Buckets: 1024  Batches: 1  Memory Usage: 12kB
                          Buffers: shared hit=1
                          ->  Seq Scan on eval_suite suite  (cost=0.00..1.42 rows=42 width=45) (actual time=0.002..0.005 rows=42.00 loops=1)
                                Buffers: shared hit=1
              ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial  (cost=0.41..6.51 rows=4 width=41) (actual time=0.005..0.006 rows=3.79 loops=372)
                    Index Cond: (run_internal_id = run.internal_id)
                    Filter: (status = ANY ('{passed,failed}'::text[]))
                    Rows Removed by Filter: 0
                    Index Searches: 372
                    Buffers: shared hit=2679
Planning:
  Buffers: shared hit=66
Planning Time: 0.718 ms
Execution Time: 5.004 ms
```

### `with scoped as (`

Median client round trip over 7 runs: 22.8ms

```sql
with scoped as (
  select c.id as case_id, c.name as case_name, s.id as suite_id, s.name as suite_name,
    v.internal_id as variant_id, v.harness as variant_harness, v.model as variant_model,
    v.sandbox as variant_sandbox, v.profile as variant_profile,
    v.user_model as variant_user_model
  from eval_case c
  join eval_suite s on s.internal_id = c.suite_internal_id
  join eval_variant v on v.case_internal_id = c.internal_id
  where c.organization_id = $1
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
    and newest.finished_at >= $2::timestamp
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
order by newest.suite_id, newest.case_id, newest.variant_id
```

Params: ["org_home_demo","2026-09-26T15:56:57.348Z"]

```
Sort  (cost=14305.60..14305.61 rows=4 width=354) (actual time=20.468..20.479 rows=443.00 loops=1)
  Sort Key: newest.suite_id, newest.case_id, newest.variant_id
  Sort Method: quicksort  Memory: 122kB
  Buffers: shared hit=25463
  ->  Nested Loop Left Join  (cost=14142.65..14305.56 rows=4 width=354) (actual time=13.855..20.211 rows=443.00 loops=1)
        Join Filter: (newest.verdict = 'unscored'::text)
        Rows Removed by Join Filter: 17
        Buffers: shared hit=25463
        ->  Nested Loop Left Join  (cost=14142.24..14240.30 rows=4 width=337) (actual time=13.846..17.793 rows=443.00 loops=1)
              Join Filter: (newest.verdict = ANY ('{failed,flaky}'::text[]))
              Buffers: shared hit=22410
              ->  Subquery Scan on newest  (cost=14125.17..14171.92 rows=4 width=273) (actual time=13.836..14.170 rows=443.00 loops=1)
                    Filter: (newest."position" = 1)
                    Rows Removed by Filter: 369
                    Buffers: shared hit=19302
                    ->  WindowAgg  (cost=14125.17..14161.29 rows=850 width=281) (actual time=13.835..14.142 rows=812.00 loops=1)
                          Window: w1 AS (PARTITION BY v.internal_id ORDER BY (row_number() OVER w1))
                          Storage: Memory  Maximum Storage: 17kB
                          Buffers: shared hit=19302
                          ->  Sort  (cost=14125.17..14127.29 rows=850 width=217) (actual time=13.832..13.869 rows=812.00 loops=1)
                                Sort Key: v.internal_id, (row_number() OVER w1)
                                Sort Method: quicksort  Memory: 193kB
                                Buffers: shared hit=19302
                                ->  Nested Loop  (cost=63.93..14083.81 rows=850 width=217) (actual time=0.087..11.914 rows=812.00 loops=1)
                                      Buffers: shared hit=19302
                                      ->  Nested Loop  (cost=47.62..14013.64 rows=850 width=209) (actual time=0.079..6.117 rows=812.00 loops=1)
                                            Buffers: shared hit=13478
                                            ->  Nested Loop  (cost=47.47..13983.01 rows=850 width=204) (actual time=0.075..5.934 rows=812.00 loops=1)
                                                  Buffers: shared hit=13468
                                                  ->  Hash Join  (cost=14.75..46.17 rows=425 width=153) (actual time=0.055..0.162 rows=480.00 loops=1)
                                                        Hash Cond: (v.case_internal_id = c.internal_id)
                                                        Buffers: shared hit=34
                                                        ->  Seq Scan on eval_variant v  (cost=0.00..29.85 rows=585 width=118) (actual time=0.005..0.030 rows=585.00 loops=1)
                                                              Buffers: shared hit=24
                                                        ->  Hash  (cost=12.75..12.75 rows=160 width=88) (actual time=0.035..0.036 rows=160.00 loops=1)
                                                              Buckets: 1024  Batches: 1  Memory Usage: 27kB
                                                              Buffers: shared hit=10
                                                              ->  Seq Scan on eval_case c  (cost=0.00..12.75 rows=160 width=88) (actual time=0.011..0.024 rows=160.00 loops=1)
                                                                    Filter: (organization_id = 'org_home_demo'::text)
                                                                    Rows Removed by Filter: 60
                                                                    Buffers: shared hit=10
                                                  ->  Limit  (cost=32.72..32.75 rows=2 width=59) (actual time=0.012..0.012 rows=1.69 loops=480)
                                                        Buffers: shared hit=13434
                                                        ->  WindowAgg  (cost=32.72..32.86 rows=8 width=59) (actual time=0.012..0.012 rows=1.69 loops=480)
                                                              Window: w1 AS (ORDER BY run.created_at, run.internal_id ROWS UNBOUNDED PRECEDING)
                                                              Storage: Memory  Maximum Storage: 17kB
                                                              Buffers: shared hit=13434
                                                              ->  Sort  (cost=32.70..32.72 rows=8 width=51) (actual time=0.011..0.011 rows=1.69 loops=480)
                                                                    Sort Key: run.created_at DESC, run.internal_id DESC
                                                                    Sort Method: quicksort  Memory: 25kB
                                                                    Buffers: shared hit=13434
                                                                    ->  Bitmap Heap Scan on eval_run run  (cost=4.34..32.58 rows=8 width=51) (actual time=0.008..0.010 rows=9.05 loops=480)
                                                                          Recheck Cond: (variant_internal_id = v.internal_id)
                                                                          Filter: (status <> 'running'::text)
                                                                          Rows Removed by Filter: 0
                                                                          Heap Blocks: exact=12445
                                                                          Buffers: shared hit=13434
                                                                          ->  Bitmap Index Scan on eval_run_variant_internal_id_created_at_idx  (cost=0.00..4.34 rows=8 width=0) (actual time=0.005..0.005 rows=27.07 loops=480)
                                                                                Index Cond: (variant_internal_id = v.internal_id)
                                                                                Index Searches: 480
                                                                                Buffers: shared hit=989
                                            ->  Memoize  (cost=0.15..0.24 rows=1 width=58) (actual time=0.000..0.000 rows=1.00 loops=812)
                                                  Cache Key: c.suite_internal_id
                                                  Cache Mode: logical
                                                  Hits: 807  Misses: 5  Evictions: 0  Overflows: 0  Memory Usage: 1kB
                                                  Buffers: shared hit=10
                                                  ->  Index Scan using eval_suite_pkey on eval_suite s  (cost=0.14..0.23 rows=1 width=58) (actual time=0.002..0.002 rows=1.00 loops=5)
                                                        Index Cond: (internal_id = c.suite_internal_id)
                                                        Index Searches: 5
                                                        Buffers: shared hit=10
                                      ->  Memoize  (cost=16.32..16.33 rows=1 width=8) (actual time=0.007..0.007 rows=1.00 loops=812)
                                            Cache Key: run.internal_id
                                            Cache Mode: binary
                                            Hits: 0  Misses: 812  Evictions: 0  Overflows: 0  Memory Usage: 111kB
                                            Buffers: shared hit=5824
                                            ->  Aggregate  (cost=16.31..16.32 rows=1 width=8) (actual time=0.007..0.007 rows=1.00 loops=812)
                                                  Buffers: shared hit=5824
                                                  ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial  (cost=0.41..16.27 rows=4 width=6) (actual time=0.005..0.006 rows=4.00 loops=812)
                                                        Index Cond: (run_internal_id = run.internal_id)
                                                        Index Searches: 812
                                                        Buffers: shared hit=5824
              ->  Limit  (cost=17.07..17.07 rows=1 width=69) (actual time=0.008..0.008 rows=0.09 loops=443)
                    Buffers: shared hit=3108
                    ->  Sort  (cost=17.07..17.07 rows=1 width=69) (actual time=0.008..0.008 rows=0.09 loops=443)
                          Sort Key: ((entry.value IS NULL)), trial_1.ordinal
                          Sort Method: quicksort  Memory: 25kB
                          Buffers: shared hit=3108
                          ->  Nested Loop Left Join  (cost=0.42..17.06 rows=1 width=69) (actual time=0.007..0.008 rows=0.19 loops=443)
                                Buffers: shared hit=3108
                                ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial_1  (cost=0.41..16.28 rows=1 width=952) (actual time=0.007..0.007 rows=0.19 loops=443)
                                      Index Cond: (run_internal_id = newest.run_id)
                                      Filter: (status = 'failed'::text)
                                      Rows Removed by Filter: 4
                                      Index Searches: 443
                                      Buffers: shared hit=3108
                                ->  Limit  (cost=0.01..0.76 rows=1 width=40) (actual time=0.004..0.004 rows=1.00 loops=83)
                                      ->  Function Scan on jsonb_array_elements entry  (cost=0.01..1.51 rows=2 width=40) (actual time=0.004..0.004 rows=1.00 loops=83)
                                            Filter: ((value ->> 'status'::text) = ANY ('{failed,error}'::text[]))
                                            Rows Removed by Filter: 1
        ->  Limit  (cost=0.41..16.28 rows=1 width=52) (actual time=0.005..0.005 rows=0.07 loops=443)
              Buffers: shared hit=3053
              ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial_2  (cost=0.41..16.28 rows=1 width=52) (actual time=0.005..0.005 rows=0.07 loops=443)
                    Index Cond: (run_internal_id = newest.run_id)
                    Filter: (status = 'void'::text)
                    Rows Removed by Filter: 4
                    Index Searches: 443
                    Buffers: shared hit=3041
Planning:
  Buffers: shared hit=20
Planning Time: 0.491 ms
Execution Time: 20.585 ms
```

### `select "internal_id", "organization_id", "trigger", "local", "status", "failure", "started`

Median client round trip over 7 runs: 0.2ms

```sql
select "internal_id", "organization_id", "trigger", "local", "status", "failure", "started_by", "created_at", "finished_at", "last_seen_at", "idempotency_key", "request_hash" from "eval_batch" where "eval_batch"."organization_id" = $1 order by "eval_batch"."created_at" desc, "eval_batch"."internal_id" desc limit $2
```

Params: ["org_home_demo",6]

```
Limit  (cost=44.67..44.68 rows=6 width=289) (actual time=0.065..0.065 rows=6.00 loops=1)
  Buffers: shared hit=27
  ->  Sort  (cost=44.67..46.02 rows=540 width=289) (actual time=0.065..0.065 rows=6.00 loops=1)
        Sort Key: created_at DESC, internal_id DESC
        Sort Method: top-N heapsort  Memory: 26kB
        Buffers: shared hit=27
        ->  Seq Scan on eval_batch  (cost=0.00..34.99 rows=540 width=289) (actual time=0.008..0.039 rows=540.00 loops=1)
              Filter: (organization_id = 'org_home_demo'::text)
              Rows Removed by Filter: 99
              Buffers: shared hit=27
Planning Time: 0.010 ms
Execution Time: 0.068 ms
```

### `select coalesce(sum(cost.amount_nanos), 0)::text as nanos`

Median client round trip over 7 runs: 6.4ms

```sql
select coalesce(sum(cost.amount_nanos), 0)::text as nanos
from eval_batch batch
join eval_run run on run.batch_internal_id = batch.internal_id
join eval_trial trial on trial.run_internal_id = run.internal_id
join eval_trial_cost cost on cost.trial_internal_id = trial.internal_id
where batch.organization_id = $1
  and batch.created_at >= $2::timestamp
  and cost.classification = 'estimate'
```

Params: ["org_home_demo","2026-09-20T15:56:57.348Z"]

```
Aggregate  (cost=8312.53..8312.55 rows=1 width=32) (actual time=6.185..6.187 rows=1.00 loops=1)
  Buffers: shared hit=5427
  ->  Hash Join  (cost=5372.78..8305.60 rows=2771 width=8) (actual time=5.850..6.153 rows=1398.00 loops=1)
        Hash Cond: (cost.trial_internal_id = trial.internal_id)
        Buffers: shared hit=5427
        ->  Seq Scan on eval_trial_cost cost  (cost=0.00..2842.49 rows=16699 width=46) (actual time=0.002..2.506 rows=16716.00 loops=1)
              Filter: (classification = 'estimate'::text)
              Rows Removed by Filter: 17403
              Buffers: shared hit=2416
        ->  Hash  (cost=5336.15..5336.15 rows=2931 width=38) (actual time=2.788..2.789 rows=1488.00 loops=1)
              Buckets: 4096  Batches: 1  Memory Usage: 134kB
              Buffers: shared hit=3011
              ->  Nested Loop  (cost=38.32..5336.15 rows=2931 width=38) (actual time=0.407..2.690 rows=1488.00 loops=1)
                    Buffers: shared hit=3011
                    ->  Hash Join  (cost=37.91..400.43 rows=755 width=35) (actual time=0.400..0.452 rows=372.00 loops=1)
                          Hash Cond: (run.batch_internal_id = batch.internal_id)
                          Buffers: shared hit=332
                          ->  Seq Scan on eval_run run  (cost=0.00..350.50 rows=4550 width=50) (actual time=0.001..0.175 rows=4550.00 loops=1)
                                Buffers: shared hit=305
                          ->  Hash  (cost=36.59..36.59 rows=106 width=17) (actual time=0.034..0.034 rows=42.00 loops=1)
                                Buckets: 1024  Batches: 1  Memory Usage: 10kB
                                Buffers: shared hit=27
                                ->  Seq Scan on eval_batch batch  (cost=0.00..36.59 rows=106 width=17) (actual time=0.029..0.032 rows=42.00 loops=1)
                                      Filter: ((created_at >= '2026-09-20 15:56:57.348'::timestamp without time zone) AND (organization_id = 'org_home_demo'::text))
                                      Rows Removed by Filter: 597
                                      Buffers: shared hit=27
                    ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial  (cost=0.41..6.50 rows=4 width=73) (actual time=0.005..0.006 rows=4.00 loops=372)
                          Index Cond: (run_internal_id = run.internal_id)
                          Index Searches: 372
                          Buffers: shared hit=2679
Planning:
  Buffers: shared hit=51
Planning Time: 0.421 ms
Execution Time: 6.203 ms
```

### `select "eval_run"."batch_internal_id", count(distinct "eval_variant"."case_internal_id"), `

Median client round trip over 7 runs: 1.4ms

```sql
select "eval_run"."batch_internal_id", count(distinct "eval_variant"."case_internal_id"), count("eval_trial"."internal_id") filter (where "eval_trial"."status" = 'passed'), count(distinct "eval_run"."internal_id"), count("eval_trial"."internal_id") filter (where "eval_trial"."status" in ('passed', 'failed')), count("eval_trial"."internal_id") filter (where "eval_trial"."status" = 'void') from "eval_run" inner join "eval_variant" on "eval_variant"."internal_id" = "eval_run"."variant_internal_id" left join "eval_trial" on "eval_trial"."run_internal_id" = "eval_run"."internal_id" where "eval_run"."batch_internal_id" in ($1, $2, $3, $4, $5) group by "eval_run"."batch_internal_id"
```

Params: ["ebat_home_0_5","ebat_home_0_4","ebat_home_0_3","ebat_home_0_2","ebat_home_0_1"]

```
GroupAggregate  (cost=1425.60..1433.07 rows=67 width=55) (actual time=0.732..0.804 rows=5.00 loops=1)
  Group Key: eval_run.batch_internal_id
  Buffers: shared hit=344
  ->  Sort  (cost=1425.60..1426.28 rows=272 width=120) (actual time=0.714..0.720 rows=280.00 loops=1)
        Sort Key: eval_run.batch_internal_id, eval_variant.case_internal_id
        Sort Method: quicksort  Memory: 63kB
        Buffers: shared hit=344
        ->  Nested Loop Left Join  (cost=59.53..1414.60 rows=272 width=120) (actual time=0.093..0.487 rows=280.00 loops=1)
              Buffers: shared hit=344
              ->  Hash Join  (cost=59.12..226.54 rows=70 width=76) (actual time=0.086..0.099 rows=70.00 loops=1)
                    Hash Cond: (eval_run.variant_internal_id = eval_variant.internal_id)
                    Buffers: shared hit=32
                    ->  Bitmap Heap Scan on eval_run  (cost=21.95..189.19 rows=70 width=81) (actual time=0.017..0.020 rows=70.00 loops=1)
                          Recheck Cond: (batch_internal_id = ANY ('{ebat_home_0_5,ebat_home_0_4,ebat_home_0_3,ebat_home_0_2,ebat_home_0_1}'::text[]))
                          Heap Blocks: exact=5
                          Buffers: shared hit=8
                          ->  Bitmap Index Scan on eval_run_batch_internal_id_variant_internal_id_idx  (cost=0.00..21.94 rows=70 width=0) (actual time=0.013..0.013 rows=110.00 loops=1)
                                Index Cond: (batch_internal_id = ANY ('{ebat_home_0_5,ebat_home_0_4,ebat_home_0_3,ebat_home_0_2,ebat_home_0_1}'::text[]))
                                Index Searches: 1
                                Buffers: shared hit=3
                    ->  Hash  (cost=29.85..29.85 rows=585 width=57) (actual time=0.068..0.068 rows=585.00 loops=1)
                          Buckets: 1024  Batches: 1  Memory Usage: 60kB
                          Buffers: shared hit=24
                          ->  Seq Scan on eval_variant  (cost=0.00..29.85 rows=585 width=57) (actual time=0.002..0.036 rows=585.00 loops=1)
                                Buffers: shared hit=24
              ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial  (cost=0.41..16.93 rows=4 width=79) (actual time=0.005..0.005 rows=4.00 loops=70)
                    Index Cond: (run_internal_id = eval_run.internal_id)
                    Index Searches: 70
                    Buffers: shared hit=312
Planning:
  Buffers: shared hit=32
Planning Time: 0.301 ms
Execution Time: 0.818 ms
```

### `select count(*) from "eval_batch" where "eval_batch"."organization_id" = $1`

Median client round trip over 7 runs: 0.2ms

```sql
select count(*) from "eval_batch" where "eval_batch"."organization_id" = $1
```

Params: ["org_home_demo"]

```
Aggregate  (cost=36.34..36.35 rows=1 width=8) (actual time=0.049..0.049 rows=1.00 loops=1)
  Buffers: shared hit=27
  ->  Seq Scan on eval_batch  (cost=0.00..34.99 rows=540 width=0) (actual time=0.008..0.037 rows=540.00 loops=1)
        Filter: (organization_id = 'org_home_demo'::text)
        Rows Removed by Filter: 99
        Buffers: shared hit=27
Planning Time: 0.008 ms
Execution Time: 0.051 ms
```

# Appendix B: final plans, 90d

## Range 90d, organization org_home_demo

End to end (all queries concurrently, pool of 8), median of 7: 26.1ms

### `select to_char(date_trunc('day', batch.created_at), 'YYYY-MM-DD') as day,`

Median client round trip over 7 runs: 24.9ms

```sql
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
where batch.organization_id = $1
  and batch.created_at >= $2::timestamp
  and trial.status in ('passed', 'failed')
group by 1, 2, 3
order by 1, 2, 3
```

Params: ["org_home_demo","2026-06-29T15:56:58.077Z"]

```
GroupAggregate  (cost=9180.33..9859.91 rows=14307 width=89) (actual time=23.906..26.055 rows=1281.00 loops=1)
  Group Key: (to_char(date_trunc('day'::text, batch.created_at), 'YYYY-MM-DD'::text)), suite.id, ((((variant.harness || '/'::text) || variant.model) || COALESCE(('@'::text || variant.profile), ''::text)))
  Buffers: shared hit=7413
  ->  Sort  (cost=9180.33..9216.10 rows=14307 width=87) (actual time=23.900..24.223 rows=16718.00 loops=1)
        Sort Key: (to_char(date_trunc('day'::text, batch.created_at), 'YYYY-MM-DD'::text)), suite.id, ((((variant.harness || '/'::text) || variant.model) || COALESCE(('@'::text || variant.profile), ''::text)))
        Sort Method: quicksort  Memory: 1923kB
        Buffers: shared hit=7413
        ->  Hash Join  (cost=504.77..8192.83 rows=14307 width=87) (actual time=1.781..16.102 rows=16718.00 loops=1)
              Hash Cond: (c.suite_internal_id = suite.internal_id)
              Buffers: shared hit=7413
              ->  Hash Join  (cost=502.82..7934.93 rows=14307 width=61) (actual time=1.769..11.307 rows=16718.00 loops=1)
                    Hash Cond: (variant.case_internal_id = c.internal_id)
                    Buffers: shared hit=7412
                    ->  Hash Join  (cost=487.87..7881.70 rows=14307 width=62) (actual time=1.740..9.616 rows=16718.00 loops=1)
                          Hash Cond: (run.variant_internal_id = variant.internal_id)
                          Buffers: shared hit=7402
                          ->  Hash Join  (cost=450.71..7806.71 rows=14307 width=45) (actual time=1.657..7.510 rows=16718.00 loops=1)
                                Hash Cond: (run.batch_internal_id = batch.internal_id)
                                Buffers: shared hit=7378
                                ->  Hash Join  (cost=407.38..7718.65 rows=16930 width=52) (actual time=1.577..6.151 rows=16930.00 loops=1)
                                      Hash Cond: (trial.run_internal_id = run.internal_id)
                                      Buffers: shared hit=7351
                                      ->  Seq Scan on eval_trial trial  (cost=0.00..7266.79 rows=16930 width=41) (actual time=0.970..3.714 rows=16930.00 loops=1)
                                            Filter: (status = ANY ('{passed,failed}'::text[]))
                                            Rows Removed by Filter: 733
                                            Buffers: shared hit=7046
                                      ->  Hash  (cost=350.50..350.50 rows=4550 width=81) (actual time=0.604..0.605 rows=4550.00 loops=1)
                                            Buckets: 8192  Batches: 1  Memory Usage: 573kB
                                            Buffers: shared hit=305
                                            ->  Seq Scan on eval_run run  (cost=0.00..350.50 rows=4550 width=81) (actual time=0.002..0.305 rows=4550.00 loops=1)
                                                  Buffers: shared hit=305
                                ->  Hash  (cost=36.59..36.59 rows=540 width=25) (actual time=0.079..0.079 rows=540.00 loops=1)
                                      Buckets: 1024  Batches: 1  Memory Usage: 37kB
                                      Buffers: shared hit=27
                                      ->  Seq Scan on eval_batch batch  (cost=0.00..36.59 rows=540 width=25) (actual time=0.013..0.051 rows=540.00 loops=1)
                                            Filter: ((created_at >= '2026-06-29 15:56:58.077'::timestamp without time zone) AND (organization_id = 'org_home_demo'::text))
                                            Rows Removed by Filter: 99
                                            Buffers: shared hit=27
                          ->  Hash  (cost=29.85..29.85 rows=585 width=79) (actual time=0.082..0.082 rows=585.00 loops=1)
                                Buckets: 1024  Batches: 1  Memory Usage: 70kB
                                Buffers: shared hit=24
                                ->  Seq Scan on eval_variant variant  (cost=0.00..29.85 rows=585 width=79) (actual time=0.002..0.036 rows=585.00 loops=1)
                                      Buffers: shared hit=24
                    ->  Hash  (cost=12.20..12.20 rows=220 width=52) (actual time=0.029..0.029 rows=220.00 loops=1)
                          Buckets: 1024  Batches: 1  Memory Usage: 27kB
                          Buffers: shared hit=10
                          ->  Seq Scan on eval_case c  (cost=0.00..12.20 rows=220 width=52) (actual time=0.002..0.016 rows=220.00 loops=1)
                                Buffers: shared hit=10
              ->  Hash  (cost=1.42..1.42 rows=42 width=45) (actual time=0.009..0.009 rows=42.00 loops=1)
                    Buckets: 1024  Batches: 1  Memory Usage: 12kB
                    Buffers: shared hit=1
                    ->  Seq Scan on eval_suite suite  (cost=0.00..1.42 rows=42 width=45) (actual time=0.003..0.005 rows=42.00 loops=1)
                          Buffers: shared hit=1
Planning:
  Buffers: shared hit=66
Planning Time: 0.834 ms
Execution Time: 26.105 ms
```

### `with scoped as (`

Median client round trip over 7 runs: 22.9ms

```sql
with scoped as (
  select c.id as case_id, c.name as case_name, s.id as suite_id, s.name as suite_name,
    v.internal_id as variant_id, v.harness as variant_harness, v.model as variant_model,
    v.sandbox as variant_sandbox, v.profile as variant_profile,
    v.user_model as variant_user_model
  from eval_case c
  join eval_suite s on s.internal_id = c.suite_internal_id
  join eval_variant v on v.case_internal_id = c.internal_id
  where c.organization_id = $1
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
    and newest.finished_at >= $2::timestamp
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
order by newest.suite_id, newest.case_id, newest.variant_id
```

Params: ["org_home_demo","2026-09-26T15:56:58.077Z"]

```
Sort  (cost=14305.60..14305.61 rows=4 width=354) (actual time=23.225..23.237 rows=443.00 loops=1)
  Sort Key: newest.suite_id, newest.case_id, newest.variant_id
  Sort Method: quicksort  Memory: 122kB
  Buffers: shared hit=25463
  ->  Nested Loop Left Join  (cost=14142.65..14305.56 rows=4 width=354) (actual time=16.518..22.981 rows=443.00 loops=1)
        Join Filter: (newest.verdict = 'unscored'::text)
        Rows Removed by Join Filter: 17
        Buffers: shared hit=25463
        ->  Nested Loop Left Join  (cost=14142.24..14240.30 rows=4 width=337) (actual time=16.496..20.487 rows=443.00 loops=1)
              Join Filter: (newest.verdict = ANY ('{failed,flaky}'::text[]))
              Buffers: shared hit=22410
              ->  Subquery Scan on newest  (cost=14125.17..14171.92 rows=4 width=273) (actual time=16.481..16.801 rows=443.00 loops=1)
                    Filter: (newest."position" = 1)
                    Rows Removed by Filter: 369
                    Buffers: shared hit=19302
                    ->  WindowAgg  (cost=14125.17..14161.29 rows=850 width=281) (actual time=16.480..16.773 rows=812.00 loops=1)
                          Window: w1 AS (PARTITION BY v.internal_id ORDER BY (row_number() OVER w1))
                          Storage: Memory  Maximum Storage: 17kB
                          Buffers: shared hit=19302
                          ->  Sort  (cost=14125.17..14127.29 rows=850 width=217) (actual time=16.475..16.499 rows=812.00 loops=1)
                                Sort Key: v.internal_id, (row_number() OVER w1)
                                Sort Method: quicksort  Memory: 193kB
                                Buffers: shared hit=19302
                                ->  Nested Loop  (cost=63.93..14083.81 rows=850 width=217) (actual time=0.151..14.524 rows=812.00 loops=1)
                                      Buffers: shared hit=19302
                                      ->  Nested Loop  (cost=47.62..14013.64 rows=850 width=209) (actual time=0.108..7.628 rows=812.00 loops=1)
                                            Buffers: shared hit=13478
                                            ->  Nested Loop  (cost=47.47..13983.01 rows=850 width=204) (actual time=0.093..7.390 rows=812.00 loops=1)
                                                  Buffers: shared hit=13468
                                                  ->  Hash Join  (cost=14.75..46.17 rows=425 width=153) (actual time=0.057..0.186 rows=480.00 loops=1)
                                                        Hash Cond: (v.case_internal_id = c.internal_id)
                                                        Buffers: shared hit=34
                                                        ->  Seq Scan on eval_variant v  (cost=0.00..29.85 rows=585 width=118) (actual time=0.004..0.033 rows=585.00 loops=1)
                                                              Buffers: shared hit=24
                                                        ->  Hash  (cost=12.75..12.75 rows=160 width=88) (actual time=0.037..0.037 rows=160.00 loops=1)
                                                              Buckets: 1024  Batches: 1  Memory Usage: 27kB
                                                              Buffers: shared hit=10
                                                              ->  Seq Scan on eval_case c  (cost=0.00..12.75 rows=160 width=88) (actual time=0.009..0.023 rows=160.00 loops=1)
                                                                    Filter: (organization_id = 'org_home_demo'::text)
                                                                    Rows Removed by Filter: 60
                                                                    Buffers: shared hit=10
                                                  ->  Limit  (cost=32.72..32.75 rows=2 width=59) (actual time=0.015..0.015 rows=1.69 loops=480)
                                                        Buffers: shared hit=13434
                                                        ->  WindowAgg  (cost=32.72..32.86 rows=8 width=59) (actual time=0.015..0.015 rows=1.69 loops=480)
                                                              Window: w1 AS (ORDER BY run.created_at, run.internal_id ROWS UNBOUNDED PRECEDING)
                                                              Storage: Memory  Maximum Storage: 17kB
                                                              Buffers: shared hit=13434
                                                              ->  Sort  (cost=32.70..32.72 rows=8 width=51) (actual time=0.014..0.014 rows=1.69 loops=480)
                                                                    Sort Key: run.created_at DESC, run.internal_id DESC
                                                                    Sort Method: quicksort  Memory: 25kB
                                                                    Buffers: shared hit=13434
                                                                    ->  Bitmap Heap Scan on eval_run run  (cost=4.34..32.58 rows=8 width=51) (actual time=0.010..0.013 rows=9.05 loops=480)
                                                                          Recheck Cond: (variant_internal_id = v.internal_id)
                                                                          Filter: (status <> 'running'::text)
                                                                          Rows Removed by Filter: 0
                                                                          Heap Blocks: exact=12445
                                                                          Buffers: shared hit=13434
                                                                          ->  Bitmap Index Scan on eval_run_variant_internal_id_created_at_idx  (cost=0.00..4.34 rows=8 width=0) (actual time=0.006..0.006 rows=27.07 loops=480)
                                                                                Index Cond: (variant_internal_id = v.internal_id)
                                                                                Index Searches: 480
                                                                                Buffers: shared hit=989
                                            ->  Memoize  (cost=0.15..0.24 rows=1 width=58) (actual time=0.000..0.000 rows=1.00 loops=812)
                                                  Cache Key: c.suite_internal_id
                                                  Cache Mode: logical
                                                  Hits: 807  Misses: 5  Evictions: 0  Overflows: 0  Memory Usage: 1kB
                                                  Buffers: shared hit=10
                                                  ->  Index Scan using eval_suite_pkey on eval_suite s  (cost=0.14..0.23 rows=1 width=58) (actual time=0.003..0.003 rows=1.00 loops=5)
                                                        Index Cond: (internal_id = c.suite_internal_id)
                                                        Index Searches: 5
                                                        Buffers: shared hit=10
                                      ->  Memoize  (cost=16.32..16.33 rows=1 width=8) (actual time=0.008..0.008 rows=1.00 loops=812)
                                            Cache Key: run.internal_id
                                            Cache Mode: binary
                                            Hits: 0  Misses: 812  Evictions: 0  Overflows: 0  Memory Usage: 111kB
                                            Buffers: shared hit=5824
                                            ->  Aggregate  (cost=16.31..16.32 rows=1 width=8) (actual time=0.008..0.008 rows=1.00 loops=812)
                                                  Buffers: shared hit=5824
                                                  ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial  (cost=0.41..16.27 rows=4 width=6) (actual time=0.006..0.007 rows=4.00 loops=812)
                                                        Index Cond: (run_internal_id = run.internal_id)
                                                        Index Searches: 812
                                                        Buffers: shared hit=5824
              ->  Limit  (cost=17.07..17.07 rows=1 width=69) (actual time=0.008..0.008 rows=0.09 loops=443)
                    Buffers: shared hit=3108
                    ->  Sort  (cost=17.07..17.07 rows=1 width=69) (actual time=0.008..0.008 rows=0.09 loops=443)
                          Sort Key: ((entry.value IS NULL)), trial_1.ordinal
                          Sort Method: quicksort  Memory: 25kB
                          Buffers: shared hit=3108
                          ->  Nested Loop Left Join  (cost=0.42..17.06 rows=1 width=69) (actual time=0.007..0.008 rows=0.19 loops=443)
                                Buffers: shared hit=3108
                                ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial_1  (cost=0.41..16.28 rows=1 width=952) (actual time=0.007..0.007 rows=0.19 loops=443)
                                      Index Cond: (run_internal_id = newest.run_id)
                                      Filter: (status = 'failed'::text)
                                      Rows Removed by Filter: 4
                                      Index Searches: 443
                                      Buffers: shared hit=3108
                                ->  Limit  (cost=0.01..0.76 rows=1 width=40) (actual time=0.004..0.004 rows=1.00 loops=83)
                                      ->  Function Scan on jsonb_array_elements entry  (cost=0.01..1.51 rows=2 width=40) (actual time=0.004..0.004 rows=1.00 loops=83)
                                            Filter: ((value ->> 'status'::text) = ANY ('{failed,error}'::text[]))
                                            Rows Removed by Filter: 1
        ->  Limit  (cost=0.41..16.28 rows=1 width=52) (actual time=0.005..0.005 rows=0.07 loops=443)
              Buffers: shared hit=3053
              ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial_2  (cost=0.41..16.28 rows=1 width=52) (actual time=0.005..0.005 rows=0.07 loops=443)
                    Index Cond: (run_internal_id = newest.run_id)
                    Filter: (status = 'void'::text)
                    Rows Removed by Filter: 4
                    Index Searches: 443
                    Buffers: shared hit=3041
Planning:
  Buffers: shared hit=20
Planning Time: 0.638 ms
Execution Time: 23.289 ms
```

### `select "internal_id", "organization_id", "trigger", "local", "status", "failure", "started`

Median client round trip over 7 runs: 0.2ms

```sql
select "internal_id", "organization_id", "trigger", "local", "status", "failure", "started_by", "created_at", "finished_at", "last_seen_at", "idempotency_key", "request_hash" from "eval_batch" where "eval_batch"."organization_id" = $1 order by "eval_batch"."created_at" desc, "eval_batch"."internal_id" desc limit $2
```

Params: ["org_home_demo",6]

```
Limit  (cost=44.67..44.68 rows=6 width=289) (actual time=0.065..0.065 rows=6.00 loops=1)
  Buffers: shared hit=27
  ->  Sort  (cost=44.67..46.02 rows=540 width=289) (actual time=0.064..0.065 rows=6.00 loops=1)
        Sort Key: created_at DESC, internal_id DESC
        Sort Method: top-N heapsort  Memory: 26kB
        Buffers: shared hit=27
        ->  Seq Scan on eval_batch  (cost=0.00..34.99 rows=540 width=289) (actual time=0.008..0.038 rows=540.00 loops=1)
              Filter: (organization_id = 'org_home_demo'::text)
              Rows Removed by Filter: 99
              Buffers: shared hit=27
Planning Time: 0.011 ms
Execution Time: 0.069 ms
```

### `select coalesce(sum(cost.amount_nanos), 0)::text as nanos`

Median client round trip over 7 runs: 12.2ms

```sql
select coalesce(sum(cost.amount_nanos), 0)::text as nanos
from eval_batch batch
join eval_run run on run.batch_internal_id = batch.internal_id
join eval_trial trial on trial.run_internal_id = run.internal_id
join eval_trial_cost cost on cost.trial_internal_id = trial.internal_id
where batch.organization_id = $1
  and batch.created_at >= $2::timestamp
  and cost.classification = 'estimate'
```

Params: ["org_home_demo","2026-06-29T15:56:58.077Z"]

```
Aggregate  (cost=10903.74..10903.76 rows=1 width=32) (actual time=13.820..13.821 rows=1.00 loops=1)
  Buffers: shared hit=9794
  ->  Hash Join  (cost=7894.13..10868.46 rows=14111 width=8) (actual time=5.555..13.458 rows=16707.00 loops=1)
        Hash Cond: (run.batch_internal_id = batch.internal_id)
        Buffers: shared hit=9794
        ->  Hash Join  (cost=7850.79..10781.01 rows=16699 width=23) (actual time=5.069..12.187 rows=16716.00 loops=1)
              Hash Cond: (trial.run_internal_id = run.internal_id)
              Buffers: shared hit=9767
              ->  Hash Join  (cost=7443.42..10329.75 rows=16699 width=43) (actual time=4.492..9.752 rows=16716.00 loops=1)
                    Hash Cond: (cost.trial_internal_id = trial.internal_id)
                    Buffers: shared hit=9462
                    ->  Seq Scan on eval_trial_cost cost  (cost=0.00..2842.49 rows=16699 width=46) (actual time=0.002..2.662 rows=16716.00 loops=1)
                          Filter: (classification = 'estimate'::text)
                          Rows Removed by Filter: 17403
                          Buffers: shared hit=2416
                    ->  Hash  (cost=7222.63..7222.63 rows=17663 width=73) (actual time=4.486..4.486 rows=17663.00 loops=1)
                          Buckets: 32768  Batches: 1  Memory Usage: 2099kB
                          Buffers: shared hit=7046
                          ->  Seq Scan on eval_trial trial  (cost=0.00..7222.63 rows=17663 width=73) (actual time=0.962..3.094 rows=17663.00 loops=1)
                                Buffers: shared hit=7046
              ->  Hash  (cost=350.50..350.50 rows=4550 width=50) (actual time=0.575..0.575 rows=4550.00 loops=1)
                    Buckets: 8192  Batches: 1  Memory Usage: 434kB
                    Buffers: shared hit=305
                    ->  Seq Scan on eval_run run  (cost=0.00..350.50 rows=4550 width=50) (actual time=0.002..0.305 rows=4550.00 loops=1)
                          Buffers: shared hit=305
        ->  Hash  (cost=36.59..36.59 rows=540 width=17) (actual time=0.076..0.076 rows=540.00 loops=1)
              Buckets: 1024  Batches: 1  Memory Usage: 33kB
              Buffers: shared hit=27
              ->  Seq Scan on eval_batch batch  (cost=0.00..36.59 rows=540 width=17) (actual time=0.014..0.051 rows=540.00 loops=1)
                    Filter: ((created_at >= '2026-06-29 15:56:58.077'::timestamp without time zone) AND (organization_id = 'org_home_demo'::text))
                    Rows Removed by Filter: 99
                    Buffers: shared hit=27
Planning:
  Buffers: shared hit=51
Planning Time: 0.604 ms
Execution Time: 13.844 ms
```

### `select "eval_run"."batch_internal_id", count(distinct "eval_variant"."case_internal_id"), `

Median client round trip over 7 runs: 1.4ms

```sql
select "eval_run"."batch_internal_id", count(distinct "eval_variant"."case_internal_id"), count("eval_trial"."internal_id") filter (where "eval_trial"."status" = 'passed'), count(distinct "eval_run"."internal_id"), count("eval_trial"."internal_id") filter (where "eval_trial"."status" in ('passed', 'failed')), count("eval_trial"."internal_id") filter (where "eval_trial"."status" = 'void') from "eval_run" inner join "eval_variant" on "eval_variant"."internal_id" = "eval_run"."variant_internal_id" left join "eval_trial" on "eval_trial"."run_internal_id" = "eval_run"."internal_id" where "eval_run"."batch_internal_id" in ($1, $2, $3, $4, $5) group by "eval_run"."batch_internal_id"
```

Params: ["ebat_home_0_5","ebat_home_0_4","ebat_home_0_3","ebat_home_0_2","ebat_home_0_1"]

```
GroupAggregate  (cost=1425.60..1433.07 rows=67 width=55) (actual time=0.697..0.769 rows=5.00 loops=1)
  Group Key: eval_run.batch_internal_id
  Buffers: shared hit=344
  ->  Sort  (cost=1425.60..1426.28 rows=272 width=120) (actual time=0.681..0.686 rows=280.00 loops=1)
        Sort Key: eval_run.batch_internal_id, eval_variant.case_internal_id
        Sort Method: quicksort  Memory: 63kB
        Buffers: shared hit=344
        ->  Nested Loop Left Join  (cost=59.53..1414.60 rows=272 width=120) (actual time=0.085..0.461 rows=280.00 loops=1)
              Buffers: shared hit=344
              ->  Hash Join  (cost=59.12..226.54 rows=70 width=76) (actual time=0.079..0.090 rows=70.00 loops=1)
                    Hash Cond: (eval_run.variant_internal_id = eval_variant.internal_id)
                    Buffers: shared hit=32
                    ->  Bitmap Heap Scan on eval_run  (cost=21.95..189.19 rows=70 width=81) (actual time=0.014..0.016 rows=70.00 loops=1)
                          Recheck Cond: (batch_internal_id = ANY ('{ebat_home_0_5,ebat_home_0_4,ebat_home_0_3,ebat_home_0_2,ebat_home_0_1}'::text[]))
                          Heap Blocks: exact=5
                          Buffers: shared hit=8
                          ->  Bitmap Index Scan on eval_run_batch_internal_id_variant_internal_id_idx  (cost=0.00..21.94 rows=70 width=0) (actual time=0.011..0.011 rows=110.00 loops=1)
                                Index Cond: (batch_internal_id = ANY ('{ebat_home_0_5,ebat_home_0_4,ebat_home_0_3,ebat_home_0_2,ebat_home_0_1}'::text[]))
                                Index Searches: 1
                                Buffers: shared hit=3
                    ->  Hash  (cost=29.85..29.85 rows=585 width=57) (actual time=0.064..0.064 rows=585.00 loops=1)
                          Buckets: 1024  Batches: 1  Memory Usage: 60kB
                          Buffers: shared hit=24
                          ->  Seq Scan on eval_variant  (cost=0.00..29.85 rows=585 width=57) (actual time=0.001..0.033 rows=585.00 loops=1)
                                Buffers: shared hit=24
              ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial  (cost=0.41..16.93 rows=4 width=79) (actual time=0.005..0.005 rows=4.00 loops=70)
                    Index Cond: (run_internal_id = eval_run.internal_id)
                    Index Searches: 70
                    Buffers: shared hit=312
Planning:
  Buffers: shared hit=32
Planning Time: 0.273 ms
Execution Time: 0.779 ms
```

### `select count(*) from "eval_batch" where "eval_batch"."organization_id" = $1`

Median client round trip over 7 runs: 0.1ms

```sql
select count(*) from "eval_batch" where "eval_batch"."organization_id" = $1
```

Params: ["org_home_demo"]

```
Aggregate  (cost=36.34..36.35 rows=1 width=8) (actual time=0.055..0.055 rows=1.00 loops=1)
  Buffers: shared hit=27
  ->  Seq Scan on eval_batch  (cost=0.00..34.99 rows=540 width=0) (actual time=0.013..0.043 rows=540.00 loops=1)
        Filter: (organization_id = 'org_home_demo'::text)
        Rows Removed by Filter: 99
        Buffers: shared hit=27
Planning Time: 0.014 ms
Execution Time: 0.058 ms
```

# Appendix C: baseline with the CTE self join, 90d (first seed)

## Range 90d, organization org_home_demo

End to end (all queries concurrently, pool of 8), median of 7: 50.9ms

### `select to_char(date_trunc('day', batch.created_at), 'YYYY-MM-DD') as day,`

Median client round trip over 7 runs: 26.1ms

```sql
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
where batch.organization_id = $1
  and batch.created_at >= $2::timestamp
  and trial.status in ('passed', 'failed')
group by 1, 2, 3
order by 1, 2, 3
```

Params: ["org_home_demo","2026-06-29T15:54:57.347Z"]

```
GroupAggregate  (cost=4221.02..4893.10 rows=14149 width=89) (actual time=26.450..28.824 rows=1304.00 loops=1)
  Group Key: (to_char(date_trunc('day'::text, batch.created_at), 'YYYY-MM-DD'::text)), suite.id, ((((variant.harness || '/'::text) || variant.model) || COALESCE(('@'::text || variant.profile), ''::text)))
  Buffers: shared hit=2473
  ->  Sort  (cost=4221.02..4256.39 rows=14149 width=87) (actual time=26.443..26.774 rows=16530.00 loops=1)
        Sort Key: (to_char(date_trunc('day'::text, batch.created_at), 'YYYY-MM-DD'::text)), suite.id, ((((variant.harness || '/'::text) || variant.model) || COALESCE(('@'::text || variant.profile), ''::text)))
        Sort Method: quicksort  Memory: 1915kB
        Buffers: shared hit=2473
        ->  Hash Join  (cost=271.96..3245.56 rows=14149 width=87) (actual time=1.123..18.350 rows=16530.00 loops=1)
              Hash Cond: (c.suite_internal_id = suite.internal_id)
              Buffers: shared hit=2473
              ->  Hash Join  (cost=270.01..2990.49 rows=14149 width=61) (actual time=1.103..13.260 rows=16530.00 loops=1)
                    Hash Cond: (variant.case_internal_id = c.internal_id)
                    Buffers: shared hit=2472
                    ->  Hash Join  (cost=260.06..2942.69 rows=14149 width=62) (actual time=1.069..11.467 rows=16530.00 loops=1)
                          Hash Cond: (run.variant_internal_id = variant.internal_id)
                          Buffers: shared hit=2467
                          ->  Hash Join  (cost=236.90..2882.12 rows=14149 width=45) (actual time=0.976..9.205 rows=16530.00 loops=1)
                                Hash Cond: (run.batch_internal_id = batch.internal_id)
                                Buffers: shared hit=2457
                                ->  Hash Join  (cost=209.56..2810.54 rows=16742 width=52) (actual time=0.873..7.704 rows=16742.00 loops=1)
                                      Hash Cond: (trial.run_internal_id = run.internal_id)
                                      Buffers: shared hit=2446
                                      ->  Seq Scan on eval_trial trial  (cost=0.00..2556.99 rows=16742 width=42) (actual time=0.003..4.673 rows=16742.00 loops=1)
                                            Filter: (status = ANY ('{passed,failed}'::text[]))
                                            Rows Removed by Filter: 777
                                            Buffers: shared hit=2338
                                      ->  Hash  (cost=153.14..153.14 rows=4514 width=81) (actual time=0.867..0.868 rows=4514.00 loops=1)
                                            Buckets: 8192  Batches: 1  Memory Usage: 570kB
                                            Buffers: shared hit=108
                                            ->  Seq Scan on eval_run run  (cost=0.00..153.14 rows=4514 width=81) (actual time=0.002..0.396 rows=4514.00 loops=1)
                                                  Buffers: shared hit=108
                                ->  Hash  (cost=20.59..20.59 rows=540 width=25) (actual time=0.083..0.083 rows=540.00 loops=1)
                                      Buckets: 1024  Batches: 1  Memory Usage: 37kB
                                      Buffers: shared hit=11
                                      ->  Seq Scan on eval_batch batch  (cost=0.00..20.59 rows=540 width=25) (actual time=0.005..0.054 rows=540.00 loops=1)
                                            Filter: ((created_at >= '2026-06-29 15:54:57.347'::timestamp without time zone) AND (organization_id = 'org_home_demo'::text))
                                            Rows Removed by Filter: 99
                                            Buffers: shared hit=11
                          ->  Hash  (cost=15.85..15.85 rows=585 width=79) (actual time=0.090..0.090 rows=585.00 loops=1)
                                Buckets: 1024  Batches: 1  Memory Usage: 70kB
                                Buffers: shared hit=10
                                ->  Seq Scan on eval_variant variant  (cost=0.00..15.85 rows=585 width=79) (actual time=0.003..0.041 rows=585.00 loops=1)
                                      Buffers: shared hit=10
                    ->  Hash  (cost=7.20..7.20 rows=220 width=52) (actual time=0.033..0.033 rows=220.00 loops=1)
                          Buckets: 1024  Batches: 1  Memory Usage: 27kB
                          Buffers: shared hit=5
                          ->  Seq Scan on eval_case c  (cost=0.00..7.20 rows=220 width=52) (actual time=0.003..0.018 rows=220.00 loops=1)
                                Buffers: shared hit=5
              ->  Hash  (cost=1.42..1.42 rows=42 width=45) (actual time=0.013..0.014 rows=42.00 loops=1)
                    Buckets: 1024  Batches: 1  Memory Usage: 12kB
                    Buffers: shared hit=1
                    ->  Seq Scan on eval_suite suite  (cost=0.00..1.42 rows=42 width=45) (actual time=0.006..0.008 rows=42.00 loops=1)
                          Buffers: shared hit=1
Planning:
  Buffers: shared hit=58
Planning Time: 1.613 ms
Execution Time: 28.885 ms
```

### `with scoped as (`

Median client round trip over 7 runs: 47.2ms

```sql
with scoped as (
  select c.id as case_id, c.name as case_name, s.id as suite_id, s.name as suite_name,
    v.internal_id as variant_id, v.harness as variant_harness, v.model as variant_model,
    v.sandbox as variant_sandbox, v.profile as variant_profile,
    v.user_model as variant_user_model
  from eval_case c
  join eval_suite s on s.internal_id = c.suite_internal_id
  join eval_variant v on v.case_internal_id = c.internal_id
  where c.organization_id = $1
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
)
select newest.case_id, newest.case_name, newest.suite_id, newest.suite_name,
  newest.variant_id, newest.variant_harness, newest.variant_model,
  newest.variant_sandbox, newest.variant_profile, newest.variant_user_model,
  newest.run_id, newest.passed, newest.scored, newest.verdict,
  (extract(epoch from newest.finished_at) * 1000)::float8 as finished_at_ms,
  (
    newest.verdict in ('failed', 'flaky')
    and newest.finished_at >= $2::timestamp
    and (previous.verdict is null or previous.verdict = 'passed')
  ) as newly_failing,
  failure.check_name as failure_check, failure.message as failure_message,
  unscored.failure as unscored_failure
from judged newest
left join judged previous
  on previous.variant_id = newest.variant_id and previous.position = 2
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
order by newest.suite_id, newest.case_id, newest.variant_id
```

Params: ["org_home_demo","2026-09-26T15:54:57.347Z"]

```
Sort  (cost=13235.68..13235.69 rows=4 width=511) (actual time=49.320..49.331 rows=473.00 loops=1)
  Sort Key: newest.suite_id, newest.case_id, newest.variant_id
  Sort Method: quicksort  Memory: 131kB
  Buffers: shared hit=13820
  CTE judged
    ->  Merge Join  (cost=46.61..13066.12 rows=850 width=249) (actual time=0.057..11.121 rows=923.00 loops=1)
          Merge Cond: (c.suite_internal_id = s.internal_id)
          Buffers: shared hit=9669
          ->  Nested Loop  (cost=46.47..13031.99 rows=850 width=212) (actual time=0.048..11.006 rows=923.00 loops=1)
                Buffers: shared hit=9667
                ->  Nested Loop  (cost=30.49..12962.83 rows=850 width=204) (actual time=0.036..5.178 rows=923.00 loops=1)
                      Buffers: shared hit=5597
                      ->  Nested Loop  (cost=0.42..150.13 rows=425 width=153) (actual time=0.010..0.612 rows=480.00 loops=1)
                            Buffers: shared hit=499
                            ->  Index Scan using eval_case_suite_internal_id_idx on eval_case c  (cost=0.14..28.93 rows=160 width=88) (actual time=0.006..0.034 rows=160.00 loops=1)
                                  Filter: (organization_id = 'org_home_demo'::text)
                                  Rows Removed by Filter: 60
                                  Index Searches: 1
                                  Buffers: shared hit=14
                            ->  Index Scan using eval_variant_case_internal_id_idx on eval_variant v  (cost=0.28..0.73 rows=3 width=118) (actual time=0.003..0.003 rows=3.00 loops=160)
                                  Index Cond: (case_internal_id = c.internal_id)
                                  Index Searches: 160
                                  Buffers: shared hit=485
                      ->  Limit  (cost=30.07..30.11 rows=2 width=59) (actual time=0.009..0.009 rows=1.92 loops=480)
                            Buffers: shared hit=5098
                            ->  WindowAgg  (cost=30.07..30.21 rows=8 width=59) (actual time=0.009..0.009 rows=1.92 loops=480)
                                  Window: w1 AS (ORDER BY run.created_at, run.internal_id ROWS UNBOUNDED PRECEDING)
                                  Storage: Memory  Maximum Storage: 17kB
                                  Buffers: shared hit=5098
                                  ->  Sort  (cost=30.05..30.07 rows=8 width=51) (actual time=0.009..0.009 rows=1.92 loops=480)
                                        Sort Key: run.created_at DESC, run.internal_id DESC
                                        Sort Method: quicksort  Memory: 26kB
                                        Buffers: shared hit=5098
                                        ->  Bitmap Heap Scan on eval_run run  (cost=4.34..29.93 rows=8 width=51) (actual time=0.006..0.008 rows=9.00 loops=480)
                                              Recheck Cond: (variant_internal_id = v.internal_id)
                                              Filter: (status <> 'running'::text)
                                              Rows Removed by Filter: 0
                                              Heap Blocks: exact=4138
                                              Buffers: shared hit=5098
                                              ->  Bitmap Index Scan on eval_run_variant_internal_id_created_at_idx  (cost=0.00..4.34 rows=8 width=0) (actual time=0.005..0.005 rows=9.00 loops=480)
                                                    Index Cond: (variant_internal_id = v.internal_id)
                                                    Index Searches: 480
                                                    Buffers: shared hit=960
                ->  Memoize  (cost=15.98..16.00 rows=1 width=8) (actual time=0.006..0.006 rows=1.00 loops=923)
                      Cache Key: run.internal_id
                      Cache Mode: binary
                      Hits: 0  Misses: 923  Evictions: 0  Overflows: 0  Memory Usage: 127kB
                      Buffers: shared hit=4070
                      ->  Aggregate  (cost=15.97..15.99 rows=1 width=8) (actual time=0.006..0.006 rows=1.00 loops=923)
                            Buffers: shared hit=4070
                            ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial_2  (cost=0.41..15.93 rows=4 width=6) (actual time=0.005..0.005 rows=4.00 loops=923)
                                  Index Cond: (run_internal_id = run.internal_id)
                                  Index Searches: 923
                                  Buffers: shared hit=4070
          ->  Index Scan using eval_suite_pkey on eval_suite s  (cost=0.14..12.77 rows=42 width=58) (actual time=0.001..0.003 rows=25.00 loops=1)
                Index Searches: 1
                Buffers: shared hit=2
  ->  Nested Loop Left Join  (cost=17.15..169.53 rows=4 width=511) (actual time=0.082..48.533 rows=473.00 loops=1)
        Join Filter: (newest.verdict = 'unscored'::text)
        Rows Removed by Join Filter: 69
        Buffers: shared hit=13820
        ->  Nested Loop Left Join  (cost=16.73..105.61 rows=4 width=496) (actual time=0.074..46.139 rows=473.00 loops=1)
              Join Filter: (newest.verdict = ANY ('{failed,flaky}'::text[]))
              Buffers: shared hit=11753
              ->  Nested Loop Left Join  (cost=0.00..38.57 rows=4 width=432) (actual time=0.068..42.050 rows=473.00 loops=1)
                    Join Filter: (previous.variant_id = newest.variant_id)
                    Rows Removed by Join Filter: 212400
                    Buffers: shared hit=9669
                    ->  CTE Scan on judged newest  (cost=0.00..19.12 rows=4 width=400) (actual time=0.058..0.141 rows=473.00 loops=1)
                          Filter: ("position" = 1)
                          Rows Removed by Filter: 450
                          Storage: Memory  Maximum Storage: 221kB
                          Buffers: shared hit=28
                    ->  CTE Scan on judged previous  (cost=0.00..19.12 rows=4 width=64) (actual time=0.000..0.077 rows=450.00 loops=473)
                          Filter: ("position" = 2)
                          Rows Removed by Filter: 473
                          Storage: Memory  Maximum Storage: 221kB
                          Buffers: shared hit=9641
              ->  Limit  (cost=16.73..16.74 rows=1 width=69) (actual time=0.008..0.008 rows=0.20 loops=473)
                    Buffers: shared hit=2084
                    ->  Sort  (cost=16.73..16.74 rows=1 width=69) (actual time=0.008..0.008 rows=0.20 loops=473)
                          Sort Key: ((entry.value IS NULL)), trial.ordinal
                          Sort Method: quicksort  Memory: 25kB
                          Buffers: shared hit=2084
                          ->  Nested Loop Left Join  (cost=0.42..16.72 rows=1 width=69) (actual time=0.008..0.008 rows=0.27 loops=473)
                                Buffers: shared hit=2084
                                ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial  (cost=0.41..15.94 rows=1 width=949) (actual time=0.006..0.006 rows=0.27 loops=473)
                                      Index Cond: (run_internal_id = newest.run_id)
                                      Filter: (status = 'failed'::text)
                                      Rows Removed by Filter: 4
                                      Index Searches: 473
                                      Buffers: shared hit=2084
                                ->  Limit  (cost=0.01..0.76 rows=1 width=40) (actual time=0.004..0.005 rows=1.00 loops=126)
                                      ->  Function Scan on jsonb_array_elements entry  (cost=0.01..1.51 rows=2 width=40) (actual time=0.004..0.004 rows=1.00 loops=126)
                                            Filter: ((value ->> 'status'::text) = ANY ('{failed,error}'::text[]))
                                            Rows Removed by Filter: 1
        ->  Limit  (cost=0.41..15.94 rows=1 width=50) (actual time=0.005..0.005 rows=0.15 loops=473)
              Buffers: shared hit=2067
              ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial_1  (cost=0.41..15.94 rows=1 width=50) (actual time=0.005..0.005 rows=0.15 loops=473)
                    Index Cond: (run_internal_id = newest.run_id)
                    Filter: (status = 'void'::text)
                    Rows Removed by Filter: 4
                    Index Searches: 473
                    Buffers: shared hit=2067
Planning:
  Buffers: shared hit=20
Planning Time: 0.507 ms
Execution Time: 49.386 ms
```

### `select "internal_id", "organization_id", "trigger", "local", "status", "failure", "started`

Median client round trip over 7 runs: 0.2ms

```sql
select "internal_id", "organization_id", "trigger", "local", "status", "failure", "started_by", "created_at", "finished_at", "last_seen_at", "idempotency_key", "request_hash" from "eval_batch" where "eval_batch"."organization_id" = $1 order by "eval_batch"."created_at" desc, "eval_batch"."internal_id" desc limit $2
```

Params: ["org_home_demo",6]

```
Limit  (cost=28.67..28.68 rows=6 width=290) (actual time=0.063..0.063 rows=6.00 loops=1)
  Buffers: shared hit=11
  ->  Sort  (cost=28.67..30.02 rows=540 width=290) (actual time=0.063..0.063 rows=6.00 loops=1)
        Sort Key: created_at DESC, internal_id DESC
        Sort Method: top-N heapsort  Memory: 26kB
        Buffers: shared hit=11
        ->  Seq Scan on eval_batch  (cost=0.00..18.99 rows=540 width=290) (actual time=0.003..0.036 rows=540.00 loops=1)
              Filter: (organization_id = 'org_home_demo'::text)
              Rows Removed by Filter: 99
              Buffers: shared hit=11
Planning Time: 0.010 ms
Execution Time: 0.066 ms
```

### `select coalesce(sum(cost.amount_nanos), 0)::text as nanos`

Median client round trip over 7 runs: 11.4ms

```sql
select coalesce(sum(cost.amount_nanos), 0)::text as nanos
from eval_batch batch
join eval_run run on run.batch_internal_id = batch.internal_id
join eval_trial trial on trial.run_internal_id = run.internal_id
join eval_trial_cost cost on cost.trial_internal_id = trial.internal_id
where batch.organization_id = $1
  and batch.created_at >= $2::timestamp
  and cost.classification = 'estimate'
```

Params: ["org_home_demo","2026-06-29T15:54:57.347Z"]

```
Aggregate  (cost=4392.59..4392.61 rows=1 width=32) (actual time=12.685..12.686 rows=1.00 loops=1)
  Buffers: shared hit=3293
  ->  Hash Join  (cost=2969.08..4357.66 rows=13973 width=8) (actual time=4.999..12.329 rows=16529.00 loops=1)
        Hash Cond: (run.batch_internal_id = batch.internal_id)
        Buffers: shared hit=3293
        ->  Hash Join  (cost=2941.74..4286.63 rows=16533 width=23) (actual time=4.850..11.082 rows=16538.00 loops=1)
              Hash Cond: (trial.run_internal_id = run.internal_id)
              Buffers: shared hit=3282
              ->  Hash Join  (cost=2732.18..4033.63 rows=16533 width=44) (actual time=4.310..8.786 rows=16538.00 loops=1)
                    Hash Cond: (cost.trial_internal_id = trial.internal_id)
                    Buffers: shared hit=3174
                    ->  Seq Scan on eval_trial_cost cost  (cost=0.00..1258.04 rows=16533 width=46) (actual time=0.002..2.033 rows=16538.00 loops=1)
                          Filter: (classification = 'estimate'::text)
                          Rows Removed by Filter: 17225
                          Buffers: shared hit=836
                    ->  Hash  (cost=2513.19..2513.19 rows=17519 width=75) (actual time=4.305..4.305 rows=17519.00 loops=1)
                          Buckets: 32768  Batches: 1  Memory Usage: 2089kB
                          Buffers: shared hit=2338
                          ->  Seq Scan on eval_trial trial  (cost=0.00..2513.19 rows=17519 width=75) (actual time=0.001..3.121 rows=17519.00 loops=1)
                                Buffers: shared hit=2338
              ->  Hash  (cost=153.14..153.14 rows=4514 width=50) (actual time=0.538..0.538 rows=4514.00 loops=1)
                    Buckets: 8192  Batches: 1  Memory Usage: 432kB
                    Buffers: shared hit=108
                    ->  Seq Scan on eval_run run  (cost=0.00..153.14 rows=4514 width=50) (actual time=0.002..0.277 rows=4514.00 loops=1)
                          Buffers: shared hit=108
        ->  Hash  (cost=20.59..20.59 rows=540 width=17) (actual time=0.075..0.075 rows=540.00 loops=1)
              Buckets: 1024  Batches: 1  Memory Usage: 33kB
              Buffers: shared hit=11
              ->  Seq Scan on eval_batch batch  (cost=0.00..20.59 rows=540 width=17) (actual time=0.006..0.049 rows=540.00 loops=1)
                    Filter: ((created_at >= '2026-06-29 15:54:57.347'::timestamp without time zone) AND (organization_id = 'org_home_demo'::text))
                    Rows Removed by Filter: 99
                    Buffers: shared hit=11
Planning:
  Buffers: shared hit=42
Planning Time: 0.455 ms
Execution Time: 12.709 ms
```

### `select "eval_run"."batch_internal_id", count(distinct "eval_variant"."case_internal_id"), `

Median client round trip over 7 runs: 0.9ms

```sql
select "eval_run"."batch_internal_id", count(distinct "eval_variant"."case_internal_id"), count("eval_trial"."internal_id") filter (where "eval_trial"."status" = 'passed'), count(distinct "eval_run"."internal_id"), count("eval_trial"."internal_id") filter (where "eval_trial"."status" in ('passed', 'failed')), count("eval_trial"."internal_id") filter (where "eval_trial"."status" = 'void') from "eval_run" inner join "eval_variant" on "eval_variant"."internal_id" = "eval_run"."variant_internal_id" left join "eval_trial" on "eval_trial"."run_internal_id" = "eval_run"."internal_id" where "eval_run"."batch_internal_id" in ($1, $2, $3, $4, $5) group by "eval_run"."batch_internal_id"
```

Params: ["ebat_home_0_5","ebat_home_0_4","ebat_home_0_3","ebat_home_0_2","ebat_home_0_1"]

```
GroupAggregate  (cost=744.47..748.73 rows=39 width=55) (actual time=0.371..0.408 rows=5.00 loops=1)
  Group Key: eval_run.batch_internal_id
  Buffers: shared hit=191
  ->  Sort  (cost=744.47..744.86 rows=155 width=121) (actual time=0.361..0.364 rows=160.00 loops=1)
        Sort Key: eval_run.batch_internal_id, eval_variant.case_internal_id
        Sort Method: quicksort  Memory: 46kB
        Buffers: shared hit=191
        ->  Nested Loop Left Join  (cost=45.30..738.83 rows=155 width=121) (actual time=0.075..0.266 rows=160.00 loops=1)
              Buffers: shared hit=191
              ->  Hash Join  (cost=44.89..124.41 rows=40 width=76) (actual time=0.070..0.077 rows=40.00 loops=1)
                    Hash Cond: (eval_run.variant_internal_id = eval_variant.internal_id)
                    Buffers: shared hit=14
                    ->  Bitmap Heap Scan on eval_run  (cost=21.72..101.14 rows=40 width=81) (actual time=0.009..0.010 rows=40.00 loops=1)
                          Recheck Cond: (batch_internal_id = ANY ('{ebat_home_0_5,ebat_home_0_4,ebat_home_0_3,ebat_home_0_2,ebat_home_0_1}'::text[]))
                          Heap Blocks: exact=2
                          Buffers: shared hit=4
                          ->  Bitmap Index Scan on eval_run_batch_internal_id_variant_internal_id_idx  (cost=0.00..21.71 rows=40 width=0) (actual time=0.008..0.008 rows=40.00 loops=1)
                                Index Cond: (batch_internal_id = ANY ('{ebat_home_0_5,ebat_home_0_4,ebat_home_0_3,ebat_home_0_2,ebat_home_0_1}'::text[]))
                                Index Searches: 1
                                Buffers: shared hit=2
                    ->  Hash  (cost=15.85..15.85 rows=585 width=57) (actual time=0.061..0.061 rows=585.00 loops=1)
                          Buckets: 1024  Batches: 1  Memory Usage: 60kB
                          Buffers: shared hit=10
                          ->  Seq Scan on eval_variant  (cost=0.00..15.85 rows=585 width=57) (actual time=0.001..0.030 rows=585.00 loops=1)
                                Buffers: shared hit=10
              ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial  (cost=0.41..15.32 rows=4 width=81) (actual time=0.004..0.004 rows=4.00 loops=40)
                    Index Cond: (run_internal_id = eval_run.internal_id)
                    Index Searches: 40
                    Buffers: shared hit=177
Planning:
  Buffers: shared hit=26
Planning Time: 0.249 ms
Execution Time: 0.416 ms
```

### `select count(*) from "eval_batch" where "eval_batch"."organization_id" = $1`

Median client round trip over 7 runs: 0.1ms

```sql
select count(*) from "eval_batch" where "eval_batch"."organization_id" = $1
```

Params: ["org_home_demo"]

```
Aggregate  (cost=20.34..20.35 rows=1 width=8) (actual time=0.048..0.048 rows=1.00 loops=1)
  Buffers: shared hit=11
  ->  Seq Scan on eval_batch  (cost=0.00..18.99 rows=540 width=0) (actual time=0.003..0.036 rows=540.00 loops=1)
        Filter: (organization_id = 'org_home_demo'::text)
        Rows Removed by Filter: 99
        Buffers: shared hit=11
Planning Time: 0.009 ms
Execution Time: 0.050 ms
```

# Appendix D: candidates, all three indexes present, 7d (first seed)

## Range 7d, organization org_home_demo

End to end (all queries concurrently, pool of 8), median of 7: 18.7ms

### `select to_char(date_trunc('day', batch.created_at), 'YYYY-MM-DD') as day,`

Median client round trip over 7 runs: 4.2ms

```sql
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
where batch.organization_id = $1
  and batch.created_at >= $2::timestamp
  and trial.status in ('passed', 'failed')
group by 1, 2, 3
order by 1, 2, 3
```

Params: ["org_home_demo","2026-09-20T15:53:22.686Z"]

```
GroupAggregate  (cost=993.11..1125.06 rows=2778 width=89) (actual time=3.345..3.501 rows=102.00 loops=1)
  Group Key: (to_char(date_trunc('day'::text, batch.created_at), 'YYYY-MM-DD'::text)), suite.id, ((((variant.harness || '/'::text) || variant.model) || COALESCE(('@'::text || variant.profile), ''::text)))
  Buffers: shared hit=808
  ->  Sort  (cost=993.11..1000.05 rows=2778 width=87) (actual time=3.338..3.365 rows=1276.00 loops=1)
        Sort Key: (to_char(date_trunc('day'::text, batch.created_at), 'YYYY-MM-DD'::text)), suite.id, ((((variant.harness || '/'::text) || variant.model) || COALESCE(('@'::text || variant.profile), ''::text)))
        Sort Method: quicksort  Memory: 137kB
        Buffers: shared hit=808
        ->  Nested Loop  (cost=57.26..834.21 rows=2778 width=87) (actual time=0.631..2.767 rows=1276.00 loops=1)
              Buffers: shared hit=808
              ->  Hash Join  (cost=56.97..228.18 rows=749 width=82) (actual time=0.620..0.797 rows=336.00 loops=1)
                    Hash Cond: (c.suite_internal_id = suite.internal_id)
                    Buffers: shared hit=135
                    ->  Hash Join  (cost=55.02..224.07 rows=749 width=90) (actual time=0.599..0.741 rows=336.00 loops=1)
                          Hash Cond: (variant.case_internal_id = c.internal_id)
                          Buffers: shared hit=134
                          ->  Hash Join  (cost=45.07..212.12 rows=749 width=91) (actual time=0.561..0.666 rows=336.00 loops=1)
                                Hash Cond: (run.variant_internal_id = variant.internal_id)
                                Buffers: shared hit=129
                                ->  Hash Join  (cost=21.91..186.98 rows=749 width=74) (actual time=0.436..0.491 rows=336.00 loops=1)
                                      Hash Cond: (run.batch_internal_id = batch.internal_id)
                                      Buffers: shared hit=119
                                      ->  Seq Scan on eval_run run  (cost=0.00..153.14 rows=4514 width=81) (actual time=0.003..0.128 rows=4514.00 loops=1)
                                            Buffers: shared hit=108
                                      ->  Hash  (cost=20.59..20.59 rows=106 width=25) (actual time=0.034..0.035 rows=42.00 loops=1)
                                            Buckets: 1024  Batches: 1  Memory Usage: 11kB
                                            Buffers: shared hit=11
                                            ->  Seq Scan on eval_batch batch  (cost=0.00..20.59 rows=106 width=25) (actual time=0.028..0.032 rows=42.00 loops=1)
                                                  Filter: ((created_at >= '2026-09-20 15:53:22.686'::timestamp without time zone) AND (organization_id = 'org_home_demo'::text))
                                                  Rows Removed by Filter: 597
                                                  Buffers: shared hit=11
                                ->  Hash  (cost=15.85..15.85 rows=585 width=79) (actual time=0.124..0.124 rows=585.00 loops=1)
                                      Buckets: 1024  Batches: 1  Memory Usage: 70kB
                                      Buffers: shared hit=10
                                      ->  Seq Scan on eval_variant variant  (cost=0.00..15.85 rows=585 width=79) (actual time=0.003..0.055 rows=585.00 loops=1)
                                            Buffers: shared hit=10
                          ->  Hash  (cost=7.20..7.20 rows=220 width=52) (actual time=0.036..0.036 rows=220.00 loops=1)
                                Buckets: 1024  Batches: 1  Memory Usage: 27kB
                                Buffers: shared hit=5
                                ->  Seq Scan on eval_case c  (cost=0.00..7.20 rows=220 width=52) (actual time=0.003..0.016 rows=220.00 loops=1)
                                      Buffers: shared hit=5
                    ->  Hash  (cost=1.42..1.42 rows=42 width=45) (actual time=0.013..0.013 rows=42.00 loops=1)
                          Buckets: 1024  Batches: 1  Memory Usage: 12kB
                          Buffers: shared hit=1
                          ->  Seq Scan on eval_suite suite  (cost=0.00..1.42 rows=42 width=45) (actual time=0.007..0.009 rows=42.00 loops=1)
                                Buffers: shared hit=1
              ->  Index Only Scan using cand_trial_run_status on eval_trial trial  (cost=0.29..0.71 rows=4 width=42) (actual time=0.005..0.005 rows=3.80 loops=336)
                    Index Cond: ((run_internal_id = run.internal_id) AND (status = ANY ('{passed,failed}'::text[])))
                    Heap Fetches: 0
                    Index Searches: 336
                    Buffers: shared hit=673
Planning:
  Buffers: shared hit=56
Planning Time: 0.916 ms
Execution Time: 3.532 ms
```

### `with scoped as (`

Median client round trip over 7 runs: 16.1ms

```sql
with scoped as (
  select c.id as case_id, c.name as case_name, s.id as suite_id, s.name as suite_name,
    v.internal_id as variant_id, v.harness as variant_harness, v.model as variant_model,
    v.sandbox as variant_sandbox, v.profile as variant_profile,
    v.user_model as variant_user_model
  from eval_case c
  join eval_suite s on s.internal_id = c.suite_internal_id
  join eval_variant v on v.case_internal_id = c.internal_id
  where c.organization_id = $1
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
    and newest.finished_at >= $2::timestamp
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
order by newest.suite_id, newest.case_id, newest.variant_id
```

Params: ["org_home_demo","2026-09-26T15:53:22.686Z"]

```
Sort  (cost=5690.57..5690.58 rows=4 width=352) (actual time=15.289..15.323 rows=473.00 loops=1)
  Sort Key: newest.suite_id, newest.case_id, newest.variant_id
  Sort Method: quicksort  Memory: 131kB
  Buffers: shared hit=5810
  ->  Nested Loop Left Join  (cost=5591.25..5690.53 rows=4 width=352) (actual time=9.570..15.031 rows=473.00 loops=1)
        Join Filter: (newest.verdict = 'unscored'::text)
        Rows Removed by Join Filter: 69
        Buffers: shared hit=5810
        ->  Nested Loop Left Join  (cost=5582.93..5657.09 rows=4 width=337) (actual time=9.556..12.881 rows=473.00 loops=1)
              Join Filter: (newest.verdict = ANY ('{failed,flaky}'::text[]))
              Buffers: shared hit=4793
              ->  Subquery Scan on newest  (cost=5573.83..5620.58 rows=4 width=273) (actual time=9.537..9.919 rows=473.00 loops=1)
                    Filter: (newest."position" = 1)
                    Rows Removed by Filter: 450
                    Buffers: shared hit=3747
                    ->  WindowAgg  (cost=5573.83..5609.96 rows=850 width=281) (actual time=9.536..9.889 rows=923.00 loops=1)
                          Window: w1 AS (PARTITION BY v.internal_id ORDER BY (row_number() OVER w1))
                          Storage: Memory  Maximum Storage: 17kB
                          Buffers: shared hit=3747
                          ->  Sort  (cost=5573.83..5575.96 rows=850 width=217) (actual time=9.528..9.589 rows=923.00 loops=1)
                                Sort Key: v.internal_id, (row_number() OVER w1)
                                Sort Method: quicksort  Memory: 217kB
                                Buffers: shared hit=3747
                                ->  Nested Loop  (cost=19.13..5532.47 rows=850 width=217) (actual time=0.069..7.281 rows=923.00 loops=1)
                                      Buffers: shared hit=3747
                                      ->  Nested Loop  (cost=14.72..5498.00 rows=850 width=209) (actual time=0.060..2.976 rows=923.00 loops=1)
                                            Buffers: shared hit=1899
                                            ->  Nested Loop  (cost=14.57..5467.37 rows=850 width=204) (actual time=0.056..2.775 rows=923.00 loops=1)
                                                  Buffers: shared hit=1889
                                                  ->  Hash Join  (cost=9.75..27.17 rows=425 width=153) (actual time=0.046..0.143 rows=480.00 loops=1)
                                                        Hash Cond: (v.case_internal_id = c.internal_id)
                                                        Buffers: shared hit=15
                                                        ->  Seq Scan on eval_variant v  (cost=0.00..15.85 rows=585 width=118) (actual time=0.003..0.022 rows=585.00 loops=1)
                                                              Buffers: shared hit=10
                                                        ->  Hash  (cost=7.75..7.75 rows=160 width=88) (actual time=0.032..0.033 rows=160.00 loops=1)
                                                              Buckets: 1024  Batches: 1  Memory Usage: 27kB
                                                              Buffers: shared hit=5
                                                              ->  Seq Scan on eval_case c  (cost=0.00..7.75 rows=160 width=88) (actual time=0.005..0.019 rows=160.00 loops=1)
                                                                    Filter: (organization_id = 'org_home_demo'::text)
                                                                    Rows Removed by Filter: 60
                                                                    Buffers: shared hit=5
                                                  ->  Limit  (cost=4.82..12.76 rows=2 width=59) (actual time=0.005..0.005 rows=1.92 loops=480)
                                                        Buffers: shared hit=1874
                                                        ->  WindowAgg  (cost=4.82..36.58 rows=8 width=59) (actual time=0.005..0.005 rows=1.92 loops=480)
                                                              Window: w1 AS (ORDER BY run.created_at, run.internal_id ROWS UNBOUNDED PRECEDING)
                                                              Storage: Memory  Maximum Storage: 17kB
                                                              Buffers: shared hit=1874
                                                              ->  Index Scan using cand_run_variant_created_id on eval_run run  (cost=0.28..36.44 rows=8 width=51) (actual time=0.004..0.005 rows=1.92 loops=480)
                                                                    Index Cond: (variant_internal_id = v.internal_id)
                                                                    Filter: (status <> 'running'::text)
                                                                    Rows Removed by Filter: 0
                                                                    Index Searches: 480
                                                                    Buffers: shared hit=1874
                                            ->  Memoize  (cost=0.15..0.24 rows=1 width=58) (actual time=0.000..0.000 rows=1.00 loops=923)
                                                  Cache Key: c.suite_internal_id
                                                  Cache Mode: logical
                                                  Hits: 918  Misses: 5  Evictions: 0  Overflows: 0  Memory Usage: 1kB
                                                  Buffers: shared hit=10
                                                  ->  Index Scan using eval_suite_pkey on eval_suite s  (cost=0.14..0.23 rows=1 width=58) (actual time=0.002..0.002 rows=1.00 loops=5)
                                                        Index Cond: (internal_id = c.suite_internal_id)
                                                        Index Searches: 5
                                                        Buffers: shared hit=10
                                      ->  Memoize  (cost=4.41..4.42 rows=1 width=8) (actual time=0.005..0.005 rows=1.00 loops=923)
                                            Cache Key: run.internal_id
                                            Cache Mode: binary
                                            Hits: 0  Misses: 923  Evictions: 0  Overflows: 0  Memory Usage: 127kB
                                            Buffers: shared hit=1848
                                            ->  Aggregate  (cost=4.40..4.41 rows=1 width=8) (actual time=0.004..0.004 rows=1.00 loops=923)
                                                  Buffers: shared hit=1848
                                                  ->  Index Only Scan using cand_trial_run_status on eval_trial trial  (cost=0.29..4.36 rows=4 width=6) (actual time=0.004..0.004 rows=4.00 loops=923)
                                                        Index Cond: (run_internal_id = run.internal_id)
                                                        Heap Fetches: 0
                                                        Index Searches: 923
                                                        Buffers: shared hit=1848
              ->  Limit  (cost=9.10..9.11 rows=1 width=69) (actual time=0.006..0.006 rows=0.20 loops=473)
                    Buffers: shared hit=1046
                    ->  Sort  (cost=9.10..9.11 rows=1 width=69) (actual time=0.006..0.006 rows=0.20 loops=473)
                          Sort Key: ((entry.value IS NULL)), trial_1.ordinal
                          Sort Method: quicksort  Memory: 25kB
                          Buffers: shared hit=1046
                          ->  Nested Loop Left Join  (cost=0.29..9.09 rows=1 width=69) (actual time=0.005..0.006 rows=0.27 loops=473)
                                Buffers: shared hit=1046
                                ->  Index Scan using cand_trial_run_status on eval_trial trial_1  (cost=0.29..8.31 rows=1 width=949) (actual time=0.004..0.004 rows=0.27 loops=473)
                                      Index Cond: ((run_internal_id = newest.run_id) AND (status = 'failed'::text))
                                      Index Searches: 473
                                      Buffers: shared hit=1046
                                ->  Limit  (cost=0.01..0.76 rows=1 width=40) (actual time=0.005..0.005 rows=1.00 loops=126)
                                      ->  Function Scan on jsonb_array_elements entry  (cost=0.01..1.51 rows=2 width=40) (actual time=0.005..0.005 rows=1.00 loops=126)
                                            Filter: ((value ->> 'status'::text) = ANY ('{failed,error}'::text[]))
                                            Rows Removed by Filter: 1
        ->  Limit  (cost=8.32..8.32 rows=1 width=50) (actual time=0.004..0.004 rows=0.15 loops=473)
              Buffers: shared hit=1017
              ->  Sort  (cost=8.32..8.32 rows=1 width=50) (actual time=0.004..0.004 rows=0.15 loops=473)
                    Sort Key: trial_2.ordinal
                    Sort Method: quicksort  Memory: 25kB
                    Buffers: shared hit=1017
                    ->  Index Scan using cand_trial_run_status on eval_trial trial_2  (cost=0.29..8.31 rows=1 width=50) (actual time=0.004..0.004 rows=0.16 loops=473)
                          Index Cond: ((run_internal_id = newest.run_id) AND (status = 'void'::text))
                          Index Searches: 473
                          Buffers: shared hit=1017
Planning:
  Buffers: shared hit=20
Planning Time: 0.499 ms
Execution Time: 15.374 ms
```

### `select "internal_id", "organization_id", "trigger", "local", "status", "failure", "started`

Median client round trip over 7 runs: 0.2ms

```sql
select "internal_id", "organization_id", "trigger", "local", "status", "failure", "started_by", "created_at", "finished_at", "last_seen_at", "idempotency_key", "request_hash" from "eval_batch" where "eval_batch"."organization_id" = $1 order by "eval_batch"."created_at" desc, "eval_batch"."internal_id" desc limit $2
```

Params: ["org_home_demo",6]

```
Limit  (cost=28.67..28.68 rows=6 width=290) (actual time=0.063..0.063 rows=6.00 loops=1)
  Buffers: shared hit=11
  ->  Sort  (cost=28.67..30.02 rows=540 width=290) (actual time=0.063..0.063 rows=6.00 loops=1)
        Sort Key: created_at DESC, internal_id DESC
        Sort Method: top-N heapsort  Memory: 26kB
        Buffers: shared hit=11
        ->  Seq Scan on eval_batch  (cost=0.00..18.99 rows=540 width=290) (actual time=0.003..0.037 rows=540.00 loops=1)
              Filter: (organization_id = 'org_home_demo'::text)
              Rows Removed by Filter: 99
              Buffers: shared hit=11
Planning Time: 0.011 ms
Execution Time: 0.067 ms
```

### `select coalesce(sum(cost.amount_nanos), 0)::text as nanos`

Median client round trip over 7 runs: 5.1ms

```sql
select coalesce(sum(cost.amount_nanos), 0)::text as nanos
from eval_batch batch
join eval_run run on run.batch_internal_id = batch.internal_id
join eval_trial trial on trial.run_internal_id = run.internal_id
join eval_trial_cost cost on cost.trial_internal_id = trial.internal_id
where batch.organization_id = $1
  and batch.created_at >= $2::timestamp
  and cost.classification = 'estimate'
```

Params: ["org_home_demo","2026-09-20T15:53:22.686Z"]

```
Aggregate  (cost=3460.61..3460.63 rows=1 width=32) (actual time=4.827..4.831 rows=1.00 loops=1)
  Buffers: shared hit=2127
  ->  Hash Join  (cost=2106.29..3453.75 rows=2743 width=8) (actual time=4.542..4.802 rows=1275.00 loops=1)
        Hash Cond: (cost.trial_internal_id = trial.internal_id)
        Buffers: shared hit=2127
        ->  Seq Scan on eval_trial_cost cost  (cost=0.00..1258.04 rows=16533 width=46) (actual time=0.003..1.942 rows=16538.00 loops=1)
              Filter: (classification = 'estimate'::text)
              Rows Removed by Filter: 17225
              Buffers: shared hit=836
        ->  Hash  (cost=2069.95..2069.95 rows=2907 width=39) (actual time=2.000..2.003 rows=1344.00 loops=1)
              Buckets: 4096  Batches: 1  Memory Usage: 125kB
              Buffers: shared hit=1291
              ->  Nested Loop  (cost=22.20..2069.95 rows=2907 width=39) (actual time=0.403..1.924 rows=1344.00 loops=1)
                    Buffers: shared hit=1291
                    ->  Hash Join  (cost=21.91..186.98 rows=749 width=35) (actual time=0.397..0.443 rows=336.00 loops=1)
                          Hash Cond: (run.batch_internal_id = batch.internal_id)
                          Buffers: shared hit=119
                          ->  Seq Scan on eval_run run  (cost=0.00..153.14 rows=4514 width=50) (actual time=0.001..0.116 rows=4514.00 loops=1)
                                Buffers: shared hit=108
                          ->  Hash  (cost=20.59..20.59 rows=106 width=17) (actual time=0.033..0.033 rows=42.00 loops=1)
                                Buckets: 1024  Batches: 1  Memory Usage: 10kB
                                Buffers: shared hit=11
                                ->  Seq Scan on eval_batch batch  (cost=0.00..20.59 rows=106 width=17) (actual time=0.027..0.030 rows=42.00 loops=1)
                                      Filter: ((created_at >= '2026-09-20 15:53:22.686'::timestamp without time zone) AND (organization_id = 'org_home_demo'::text))
                                      Rows Removed by Filter: 597
                                      Buffers: shared hit=11
                    ->  Index Scan using cand_trial_run_status on eval_trial trial  (cost=0.29..2.47 rows=4 width=75) (actual time=0.004..0.004 rows=4.00 loops=336)
                          Index Cond: (run_internal_id = run.internal_id)
                          Index Searches: 336
                          Buffers: shared hit=1172
Planning:
  Buffers: shared hit=40
Planning Time: 0.463 ms
Execution Time: 4.846 ms
```

### `select "eval_run"."batch_internal_id", count(distinct "eval_variant"."case_internal_id"), `

Median client round trip over 7 runs: 0.8ms

```sql
select "eval_run"."batch_internal_id", count(distinct "eval_variant"."case_internal_id"), count("eval_trial"."internal_id") filter (where "eval_trial"."status" = 'passed'), count(distinct "eval_run"."internal_id"), count("eval_trial"."internal_id") filter (where "eval_trial"."status" in ('passed', 'failed')), count("eval_trial"."internal_id") filter (where "eval_trial"."status" = 'void') from "eval_run" inner join "eval_variant" on "eval_variant"."internal_id" = "eval_run"."variant_internal_id" left join "eval_trial" on "eval_trial"."run_internal_id" = "eval_run"."internal_id" where "eval_run"."batch_internal_id" in ($1, $2, $3, $4, $5) group by "eval_run"."batch_internal_id"
```

Params: ["ebat_home_0_5","ebat_home_0_4","ebat_home_0_3","ebat_home_0_2","ebat_home_0_1"]

```
GroupAggregate  (cost=715.47..719.73 rows=39 width=55) (actual time=0.347..0.386 rows=5.00 loops=1)
  Group Key: eval_run.batch_internal_id
  Buffers: shared hit=154
  ->  Sort  (cost=715.47..715.86 rows=155 width=121) (actual time=0.337..0.341 rows=160.00 loops=1)
        Sort Key: eval_run.batch_internal_id, eval_variant.case_internal_id
        Sort Method: quicksort  Memory: 46kB
        Buffers: shared hit=154
        ->  Nested Loop Left Join  (cost=45.17..709.83 rows=155 width=121) (actual time=0.075..0.237 rows=160.00 loops=1)
              Buffers: shared hit=154
              ->  Hash Join  (cost=44.89..124.41 rows=40 width=76) (actual time=0.071..0.078 rows=40.00 loops=1)
                    Hash Cond: (eval_run.variant_internal_id = eval_variant.internal_id)
                    Buffers: shared hit=14
                    ->  Bitmap Heap Scan on eval_run  (cost=21.72..101.14 rows=40 width=81) (actual time=0.009..0.010 rows=40.00 loops=1)
                          Recheck Cond: (batch_internal_id = ANY ('{ebat_home_0_5,ebat_home_0_4,ebat_home_0_3,ebat_home_0_2,ebat_home_0_1}'::text[]))
                          Heap Blocks: exact=2
                          Buffers: shared hit=4
                          ->  Bitmap Index Scan on eval_run_batch_internal_id_variant_internal_id_idx  (cost=0.00..21.71 rows=40 width=0) (actual time=0.008..0.008 rows=40.00 loops=1)
                                Index Cond: (batch_internal_id = ANY ('{ebat_home_0_5,ebat_home_0_4,ebat_home_0_3,ebat_home_0_2,ebat_home_0_1}'::text[]))
                                Index Searches: 1
                                Buffers: shared hit=2
                    ->  Hash  (cost=15.85..15.85 rows=585 width=57) (actual time=0.061..0.061 rows=585.00 loops=1)
                          Buckets: 1024  Batches: 1  Memory Usage: 60kB
                          Buffers: shared hit=10
                          ->  Seq Scan on eval_variant  (cost=0.00..15.85 rows=585 width=57) (actual time=0.002..0.031 rows=585.00 loops=1)
                                Buffers: shared hit=10
              ->  Index Scan using cand_trial_run_status on eval_trial  (cost=0.29..14.60 rows=4 width=81) (actual time=0.004..0.004 rows=4.00 loops=40)
                    Index Cond: (run_internal_id = eval_run.internal_id)
                    Index Searches: 40
                    Buffers: shared hit=140
Planning:
  Buffers: shared hit=24
Planning Time: 0.257 ms
Execution Time: 0.393 ms
```

### `select count(*) from "eval_batch" where "eval_batch"."organization_id" = $1`

Median client round trip over 7 runs: 0.1ms

```sql
select count(*) from "eval_batch" where "eval_batch"."organization_id" = $1
```

Params: ["org_home_demo"]

```
Aggregate  (cost=20.34..20.35 rows=1 width=8) (actual time=0.049..0.049 rows=1.00 loops=1)
  Buffers: shared hit=11
  ->  Seq Scan on eval_batch  (cost=0.00..18.99 rows=540 width=0) (actual time=0.003..0.037 rows=540.00 loops=1)
        Filter: (organization_id = 'org_home_demo'::text)
        Rows Removed by Filter: 99
        Buffers: shared hit=11
Planning Time: 0.009 ms
Execution Time: 0.051 ms
```

# Appendix E: candidates, 90d (first seed)

## Range 90d, organization org_home_demo

End to end (all queries concurrently, pool of 8), median of 7: 27.3ms

### `select to_char(date_trunc('day', batch.created_at), 'YYYY-MM-DD') as day,`

Median client round trip over 7 runs: 25.8ms

```sql
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
where batch.organization_id = $1
  and batch.created_at >= $2::timestamp
  and trial.status in ('passed', 'failed')
group by 1, 2, 3
order by 1, 2, 3
```

Params: ["org_home_demo","2026-06-29T15:53:23.271Z"]

```
GroupAggregate  (cost=2227.13..2899.21 rows=14149 width=89) (actual time=24.660..26.638 rows=1304.00 loops=1)
  Group Key: (to_char(date_trunc('day'::text, batch.created_at), 'YYYY-MM-DD'::text)), suite.id, ((((variant.harness || '/'::text) || variant.model) || COALESCE(('@'::text || variant.profile), ''::text)))
  Buffers: shared hit=201
  ->  Sort  (cost=2227.13..2262.51 rows=14149 width=87) (actual time=24.655..24.969 rows=16530.00 loops=1)
        Sort Key: (to_char(date_trunc('day'::text, batch.created_at), 'YYYY-MM-DD'::text)), suite.id, ((((variant.harness || '/'::text) || variant.model) || COALESCE(('@'::text || variant.profile), ''::text)))
        Sort Method: quicksort  Memory: 1915kB
        Buffers: shared hit=201
        ->  Hash Join  (cost=272.25..1251.67 rows=14149 width=87) (actual time=0.846..13.096 rows=16530.00 loops=1)
              Hash Cond: (c.suite_internal_id = suite.internal_id)
              Buffers: shared hit=201
              ->  Hash Join  (cost=270.30..996.60 rows=14149 width=61) (actual time=0.831..8.443 rows=16530.00 loops=1)
                    Hash Cond: (variant.case_internal_id = c.internal_id)
                    Buffers: shared hit=200
                    ->  Hash Join  (cost=260.35..948.80 rows=14149 width=62) (actual time=0.797..6.748 rows=16530.00 loops=1)
                          Hash Cond: (run.variant_internal_id = variant.internal_id)
                          Buffers: shared hit=195
                          ->  Hash Join  (cost=237.19..888.23 rows=14149 width=45) (actual time=0.707..4.692 rows=16530.00 loops=1)
                                Hash Cond: (run.batch_internal_id = batch.internal_id)
                                Buffers: shared hit=185
                                ->  Hash Join  (cost=209.85..816.66 rows=16742 width=52) (actual time=0.630..3.353 rows=16742.00 loops=1)
                                      Hash Cond: (trial.run_internal_id = run.internal_id)
                                      Buffers: shared hit=174
                                      ->  Index Only Scan using cand_trial_run_status on eval_trial trial  (cost=0.29..563.10 rows=16742 width=42) (actual time=0.047..0.940 rows=16742.00 loops=1)
                                            Index Cond: (status = ANY ('{passed,failed}'::text[]))
                                            Heap Fetches: 0
                                            Index Searches: 1
                                            Buffers: shared hit=66
                                      ->  Hash  (cost=153.14..153.14 rows=4514 width=81) (actual time=0.581..0.582 rows=4514.00 loops=1)
                                            Buckets: 8192  Batches: 1  Memory Usage: 570kB
                                            Buffers: shared hit=108
                                            ->  Seq Scan on eval_run run  (cost=0.00..153.14 rows=4514 width=81) (actual time=0.002..0.274 rows=4514.00 loops=1)
                                                  Buffers: shared hit=108
                                ->  Hash  (cost=20.59..20.59 rows=540 width=25) (actual time=0.076..0.076 rows=540.00 loops=1)
                                      Buckets: 1024  Batches: 1  Memory Usage: 37kB
                                      Buffers: shared hit=11
                                      ->  Seq Scan on eval_batch batch  (cost=0.00..20.59 rows=540 width=25) (actual time=0.005..0.047 rows=540.00 loops=1)
                                            Filter: ((created_at >= '2026-06-29 15:53:23.271'::timestamp without time zone) AND (organization_id = 'org_home_demo'::text))
                                            Rows Removed by Filter: 99
                                            Buffers: shared hit=11
                          ->  Hash  (cost=15.85..15.85 rows=585 width=79) (actual time=0.089..0.089 rows=585.00 loops=1)
                                Buckets: 1024  Batches: 1  Memory Usage: 70kB
                                Buffers: shared hit=10
                                ->  Seq Scan on eval_variant variant  (cost=0.00..15.85 rows=585 width=79) (actual time=0.003..0.040 rows=585.00 loops=1)
                                      Buffers: shared hit=10
                    ->  Hash  (cost=7.20..7.20 rows=220 width=52) (actual time=0.033..0.033 rows=220.00 loops=1)
                          Buckets: 1024  Batches: 1  Memory Usage: 27kB
                          Buffers: shared hit=5
                          ->  Seq Scan on eval_case c  (cost=0.00..7.20 rows=220 width=52) (actual time=0.003..0.018 rows=220.00 loops=1)
                                Buffers: shared hit=5
              ->  Hash  (cost=1.42..1.42 rows=42 width=45) (actual time=0.012..0.012 rows=42.00 loops=1)
                    Buckets: 1024  Batches: 1  Memory Usage: 12kB
                    Buffers: shared hit=1
                    ->  Seq Scan on eval_suite suite  (cost=0.00..1.42 rows=42 width=45) (actual time=0.006..0.008 rows=42.00 loops=1)
                          Buffers: shared hit=1
Planning:
  Buffers: shared hit=56
Planning Time: 0.944 ms
Execution Time: 26.696 ms
```

### `with scoped as (`

Median client round trip over 7 runs: 16.0ms

```sql
with scoped as (
  select c.id as case_id, c.name as case_name, s.id as suite_id, s.name as suite_name,
    v.internal_id as variant_id, v.harness as variant_harness, v.model as variant_model,
    v.sandbox as variant_sandbox, v.profile as variant_profile,
    v.user_model as variant_user_model
  from eval_case c
  join eval_suite s on s.internal_id = c.suite_internal_id
  join eval_variant v on v.case_internal_id = c.internal_id
  where c.organization_id = $1
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
    and newest.finished_at >= $2::timestamp
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
order by newest.suite_id, newest.case_id, newest.variant_id
```

Params: ["org_home_demo","2026-09-26T15:53:23.271Z"]

```
Sort  (cost=5690.57..5690.58 rows=4 width=352) (actual time=14.669..14.680 rows=473.00 loops=1)
  Sort Key: newest.suite_id, newest.case_id, newest.variant_id
  Sort Method: quicksort  Memory: 131kB
  Buffers: shared hit=5810
  ->  Nested Loop Left Join  (cost=5591.25..5690.53 rows=4 width=352) (actual time=9.364..14.413 rows=473.00 loops=1)
        Join Filter: (newest.verdict = 'unscored'::text)
        Rows Removed by Join Filter: 69
        Buffers: shared hit=5810
        ->  Nested Loop Left Join  (cost=5582.93..5657.09 rows=4 width=337) (actual time=9.351..12.359 rows=473.00 loops=1)
              Join Filter: (newest.verdict = ANY ('{failed,flaky}'::text[]))
              Buffers: shared hit=4793
              ->  Subquery Scan on newest  (cost=5573.83..5620.58 rows=4 width=273) (actual time=9.341..9.658 rows=473.00 loops=1)
                    Filter: (newest."position" = 1)
                    Rows Removed by Filter: 450
                    Buffers: shared hit=3747
                    ->  WindowAgg  (cost=5573.83..5609.96 rows=850 width=281) (actual time=9.340..9.628 rows=923.00 loops=1)
                          Window: w1 AS (PARTITION BY v.internal_id ORDER BY (row_number() OVER w1))
                          Storage: Memory  Maximum Storage: 17kB
                          Buffers: shared hit=3747
                          ->  Sort  (cost=5573.83..5575.96 rows=850 width=217) (actual time=9.335..9.357 rows=923.00 loops=1)
                                Sort Key: v.internal_id, (row_number() OVER w1)
                                Sort Method: quicksort  Memory: 217kB
                                Buffers: shared hit=3747
                                ->  Nested Loop  (cost=19.13..5532.47 rows=850 width=217) (actual time=0.067..6.999 rows=923.00 loops=1)
                                      Buffers: shared hit=3747
                                      ->  Nested Loop  (cost=14.72..5498.00 rows=850 width=209) (actual time=0.059..2.795 rows=923.00 loops=1)
                                            Buffers: shared hit=1899
                                            ->  Nested Loop  (cost=14.57..5467.37 rows=850 width=204) (actual time=0.055..2.609 rows=923.00 loops=1)
                                                  Buffers: shared hit=1889
                                                  ->  Hash Join  (cost=9.75..27.17 rows=425 width=153) (actual time=0.046..0.144 rows=480.00 loops=1)
                                                        Hash Cond: (v.case_internal_id = c.internal_id)
                                                        Buffers: shared hit=15
                                                        ->  Seq Scan on eval_variant v  (cost=0.00..15.85 rows=585 width=118) (actual time=0.003..0.023 rows=585.00 loops=1)
                                                              Buffers: shared hit=10
                                                        ->  Hash  (cost=7.75..7.75 rows=160 width=88) (actual time=0.033..0.033 rows=160.00 loops=1)
                                                              Buckets: 1024  Batches: 1  Memory Usage: 27kB
                                                              Buffers: shared hit=5
                                                              ->  Seq Scan on eval_case c  (cost=0.00..7.75 rows=160 width=88) (actual time=0.005..0.020 rows=160.00 loops=1)
                                                                    Filter: (organization_id = 'org_home_demo'::text)
                                                                    Rows Removed by Filter: 60
                                                                    Buffers: shared hit=5
                                                  ->  Limit  (cost=4.82..12.76 rows=2 width=59) (actual time=0.004..0.005 rows=1.92 loops=480)
                                                        Buffers: shared hit=1874
                                                        ->  WindowAgg  (cost=4.82..36.58 rows=8 width=59) (actual time=0.004..0.005 rows=1.92 loops=480)
                                                              Window: w1 AS (ORDER BY run.created_at, run.internal_id ROWS UNBOUNDED PRECEDING)
                                                              Storage: Memory  Maximum Storage: 17kB
                                                              Buffers: shared hit=1874
                                                              ->  Index Scan using cand_run_variant_created_id on eval_run run  (cost=0.28..36.44 rows=8 width=51) (actual time=0.004..0.005 rows=1.92 loops=480)
                                                                    Index Cond: (variant_internal_id = v.internal_id)
                                                                    Filter: (status <> 'running'::text)
                                                                    Rows Removed by Filter: 0
                                                                    Index Searches: 480
                                                                    Buffers: shared hit=1874
                                            ->  Memoize  (cost=0.15..0.24 rows=1 width=58) (actual time=0.000..0.000 rows=1.00 loops=923)
                                                  Cache Key: c.suite_internal_id
                                                  Cache Mode: logical
                                                  Hits: 918  Misses: 5  Evictions: 0  Overflows: 0  Memory Usage: 1kB
                                                  Buffers: shared hit=10
                                                  ->  Index Scan using eval_suite_pkey on eval_suite s  (cost=0.14..0.23 rows=1 width=58) (actual time=0.002..0.002 rows=1.00 loops=5)
                                                        Index Cond: (internal_id = c.suite_internal_id)
                                                        Index Searches: 5
                                                        Buffers: shared hit=10
                                      ->  Memoize  (cost=4.41..4.42 rows=1 width=8) (actual time=0.004..0.004 rows=1.00 loops=923)
                                            Cache Key: run.internal_id
                                            Cache Mode: binary
                                            Hits: 0  Misses: 923  Evictions: 0  Overflows: 0  Memory Usage: 127kB
                                            Buffers: shared hit=1848
                                            ->  Aggregate  (cost=4.40..4.41 rows=1 width=8) (actual time=0.004..0.004 rows=1.00 loops=923)
                                                  Buffers: shared hit=1848
                                                  ->  Index Only Scan using cand_trial_run_status on eval_trial trial  (cost=0.29..4.36 rows=4 width=6) (actual time=0.004..0.004 rows=4.00 loops=923)
                                                        Index Cond: (run_internal_id = run.internal_id)
                                                        Heap Fetches: 0
                                                        Index Searches: 923
                                                        Buffers: shared hit=1848
              ->  Limit  (cost=9.10..9.11 rows=1 width=69) (actual time=0.006..0.006 rows=0.20 loops=473)
                    Buffers: shared hit=1046
                    ->  Sort  (cost=9.10..9.11 rows=1 width=69) (actual time=0.005..0.005 rows=0.20 loops=473)
                          Sort Key: ((entry.value IS NULL)), trial_1.ordinal
                          Sort Method: quicksort  Memory: 25kB
                          Buffers: shared hit=1046
                          ->  Nested Loop Left Join  (cost=0.29..9.09 rows=1 width=69) (actual time=0.005..0.005 rows=0.27 loops=473)
                                Buffers: shared hit=1046
                                ->  Index Scan using cand_trial_run_status on eval_trial trial_1  (cost=0.29..8.31 rows=1 width=949) (actual time=0.004..0.004 rows=0.27 loops=473)
                                      Index Cond: ((run_internal_id = newest.run_id) AND (status = 'failed'::text))
                                      Index Searches: 473
                                      Buffers: shared hit=1046
                                ->  Limit  (cost=0.01..0.76 rows=1 width=40) (actual time=0.004..0.004 rows=1.00 loops=126)
                                      ->  Function Scan on jsonb_array_elements entry  (cost=0.01..1.51 rows=2 width=40) (actual time=0.004..0.004 rows=1.00 loops=126)
                                            Filter: ((value ->> 'status'::text) = ANY ('{failed,error}'::text[]))
                                            Rows Removed by Filter: 1
        ->  Limit  (cost=8.32..8.32 rows=1 width=50) (actual time=0.004..0.004 rows=0.15 loops=473)
              Buffers: shared hit=1017
              ->  Sort  (cost=8.32..8.32 rows=1 width=50) (actual time=0.004..0.004 rows=0.15 loops=473)
                    Sort Key: trial_2.ordinal
                    Sort Method: quicksort  Memory: 25kB
                    Buffers: shared hit=1017
                    ->  Index Scan using cand_trial_run_status on eval_trial trial_2  (cost=0.29..8.31 rows=1 width=50) (actual time=0.004..0.004 rows=0.16 loops=473)
                          Index Cond: ((run_internal_id = newest.run_id) AND (status = 'void'::text))
                          Index Searches: 473
                          Buffers: shared hit=1017
Planning:
  Buffers: shared hit=20
Planning Time: 0.494 ms
Execution Time: 14.727 ms
```

### `select "internal_id", "organization_id", "trigger", "local", "status", "failure", "started`

Median client round trip over 7 runs: 0.3ms

```sql
select "internal_id", "organization_id", "trigger", "local", "status", "failure", "started_by", "created_at", "finished_at", "last_seen_at", "idempotency_key", "request_hash" from "eval_batch" where "eval_batch"."organization_id" = $1 order by "eval_batch"."created_at" desc, "eval_batch"."internal_id" desc limit $2
```

Params: ["org_home_demo",6]

```
Limit  (cost=28.67..28.68 rows=6 width=290) (actual time=0.061..0.061 rows=6.00 loops=1)
  Buffers: shared hit=11
  ->  Sort  (cost=28.67..30.02 rows=540 width=290) (actual time=0.060..0.061 rows=6.00 loops=1)
        Sort Key: created_at DESC, internal_id DESC
        Sort Method: top-N heapsort  Memory: 26kB
        Buffers: shared hit=11
        ->  Seq Scan on eval_batch  (cost=0.00..18.99 rows=540 width=290) (actual time=0.003..0.036 rows=540.00 loops=1)
              Filter: (organization_id = 'org_home_demo'::text)
              Rows Removed by Filter: 99
              Buffers: shared hit=11
Planning Time: 0.011 ms
Execution Time: 0.064 ms
```

### `select coalesce(sum(cost.amount_nanos), 0)::text as nanos`

Median client round trip over 7 runs: 11.4ms

```sql
select coalesce(sum(cost.amount_nanos), 0)::text as nanos
from eval_batch batch
join eval_run run on run.batch_internal_id = batch.internal_id
join eval_trial trial on trial.run_internal_id = run.internal_id
join eval_trial_cost cost on cost.trial_internal_id = trial.internal_id
where batch.organization_id = $1
  and batch.created_at >= $2::timestamp
  and cost.classification = 'estimate'
```

Params: ["org_home_demo","2026-06-29T15:53:23.271Z"]

```
Aggregate  (cost=4392.59..4392.61 rows=1 width=32) (actual time=11.974..11.975 rows=1.00 loops=1)
  Buffers: shared hit=3293
  ->  Hash Join  (cost=2969.08..4357.66 rows=13973 width=8) (actual time=4.146..11.617 rows=16529.00 loops=1)
        Hash Cond: (run.batch_internal_id = batch.internal_id)
        Buffers: shared hit=3293
        ->  Hash Join  (cost=2941.74..4286.63 rows=16533 width=23) (actual time=3.994..10.357 rows=16538.00 loops=1)
              Hash Cond: (trial.run_internal_id = run.internal_id)
              Buffers: shared hit=3282
              ->  Hash Join  (cost=2732.18..4033.63 rows=16533 width=44) (actual time=3.378..7.981 rows=16538.00 loops=1)
                    Hash Cond: (cost.trial_internal_id = trial.internal_id)
                    Buffers: shared hit=3174
                    ->  Seq Scan on eval_trial_cost cost  (cost=0.00..1258.04 rows=16533 width=46) (actual time=0.005..2.139 rows=16538.00 loops=1)
                          Filter: (classification = 'estimate'::text)
                          Rows Removed by Filter: 17225
                          Buffers: shared hit=836
                    ->  Hash  (cost=2513.19..2513.19 rows=17519 width=75) (actual time=3.370..3.370 rows=17519.00 loops=1)
                          Buckets: 32768  Batches: 1  Memory Usage: 2089kB
                          Buffers: shared hit=2338
                          ->  Seq Scan on eval_trial trial  (cost=0.00..2513.19 rows=17519 width=75) (actual time=0.002..2.213 rows=17519.00 loops=1)
                                Buffers: shared hit=2338
              ->  Hash  (cost=153.14..153.14 rows=4514 width=50) (actual time=0.613..0.613 rows=4514.00 loops=1)
                    Buckets: 8192  Batches: 1  Memory Usage: 432kB
                    Buffers: shared hit=108
                    ->  Seq Scan on eval_run run  (cost=0.00..153.14 rows=4514 width=50) (actual time=0.002..0.324 rows=4514.00 loops=1)
                          Buffers: shared hit=108
        ->  Hash  (cost=20.59..20.59 rows=540 width=17) (actual time=0.076..0.076 rows=540.00 loops=1)
              Buckets: 1024  Batches: 1  Memory Usage: 33kB
              Buffers: shared hit=11
              ->  Seq Scan on eval_batch batch  (cost=0.00..20.59 rows=540 width=17) (actual time=0.006..0.050 rows=540.00 loops=1)
                    Filter: ((created_at >= '2026-06-29 15:53:23.271'::timestamp without time zone) AND (organization_id = 'org_home_demo'::text))
                    Rows Removed by Filter: 99
                    Buffers: shared hit=11
Planning:
  Buffers: shared hit=40
Planning Time: 0.464 ms
Execution Time: 12.000 ms
```

### `select "eval_run"."batch_internal_id", count(distinct "eval_variant"."case_internal_id"), `

Median client round trip over 7 runs: 0.9ms

```sql
select "eval_run"."batch_internal_id", count(distinct "eval_variant"."case_internal_id"), count("eval_trial"."internal_id") filter (where "eval_trial"."status" = 'passed'), count(distinct "eval_run"."internal_id"), count("eval_trial"."internal_id") filter (where "eval_trial"."status" in ('passed', 'failed')), count("eval_trial"."internal_id") filter (where "eval_trial"."status" = 'void') from "eval_run" inner join "eval_variant" on "eval_variant"."internal_id" = "eval_run"."variant_internal_id" left join "eval_trial" on "eval_trial"."run_internal_id" = "eval_run"."internal_id" where "eval_run"."batch_internal_id" in ($1, $2, $3, $4, $5) group by "eval_run"."batch_internal_id"
```

Params: ["ebat_home_0_5","ebat_home_0_4","ebat_home_0_3","ebat_home_0_2","ebat_home_0_1"]

```
GroupAggregate  (cost=715.47..719.73 rows=39 width=55) (actual time=0.358..0.399 rows=5.00 loops=1)
  Group Key: eval_run.batch_internal_id
  Buffers: shared hit=154
  ->  Sort  (cost=715.47..715.86 rows=155 width=121) (actual time=0.347..0.351 rows=160.00 loops=1)
        Sort Key: eval_run.batch_internal_id, eval_variant.case_internal_id
        Sort Method: quicksort  Memory: 46kB
        Buffers: shared hit=154
        ->  Nested Loop Left Join  (cost=45.17..709.83 rows=155 width=121) (actual time=0.079..0.247 rows=160.00 loops=1)
              Buffers: shared hit=154
              ->  Hash Join  (cost=44.89..124.41 rows=40 width=76) (actual time=0.074..0.081 rows=40.00 loops=1)
                    Hash Cond: (eval_run.variant_internal_id = eval_variant.internal_id)
                    Buffers: shared hit=14
                    ->  Bitmap Heap Scan on eval_run  (cost=21.72..101.14 rows=40 width=81) (actual time=0.010..0.012 rows=40.00 loops=1)
                          Recheck Cond: (batch_internal_id = ANY ('{ebat_home_0_5,ebat_home_0_4,ebat_home_0_3,ebat_home_0_2,ebat_home_0_1}'::text[]))
                          Heap Blocks: exact=2
                          Buffers: shared hit=4
                          ->  Bitmap Index Scan on eval_run_batch_internal_id_variant_internal_id_idx  (cost=0.00..21.71 rows=40 width=0) (actual time=0.009..0.009 rows=40.00 loops=1)
                                Index Cond: (batch_internal_id = ANY ('{ebat_home_0_5,ebat_home_0_4,ebat_home_0_3,ebat_home_0_2,ebat_home_0_1}'::text[]))
                                Index Searches: 1
                                Buffers: shared hit=2
                    ->  Hash  (cost=15.85..15.85 rows=585 width=57) (actual time=0.062..0.062 rows=585.00 loops=1)
                          Buckets: 1024  Batches: 1  Memory Usage: 60kB
                          Buffers: shared hit=10
                          ->  Seq Scan on eval_variant  (cost=0.00..15.85 rows=585 width=57) (actual time=0.002..0.032 rows=585.00 loops=1)
                                Buffers: shared hit=10
              ->  Index Scan using cand_trial_run_status on eval_trial  (cost=0.29..14.60 rows=4 width=81) (actual time=0.004..0.004 rows=4.00 loops=40)
                    Index Cond: (run_internal_id = eval_run.internal_id)
                    Index Searches: 40
                    Buffers: shared hit=140
Planning:
  Buffers: shared hit=24
Planning Time: 0.306 ms
Execution Time: 0.410 ms
```

### `select count(*) from "eval_batch" where "eval_batch"."organization_id" = $1`

Median client round trip over 7 runs: 0.2ms

```sql
select count(*) from "eval_batch" where "eval_batch"."organization_id" = $1
```

Params: ["org_home_demo"]

```
Aggregate  (cost=20.34..20.35 rows=1 width=8) (actual time=0.054..0.054 rows=1.00 loops=1)
  Buffers: shared hit=11
  ->  Seq Scan on eval_batch  (cost=0.00..18.99 rows=540 width=0) (actual time=0.005..0.041 rows=540.00 loops=1)
        Filter: (organization_id = 'org_home_demo'::text)
        Rows Removed by Filter: 99
        Buffers: shared hit=11
Planning Time: 0.014 ms
Execution Time: 0.058 ms
```

# Appendix F: eval_run index alone, before (scratch clone, first seed), 7d

## Range 7d, organization org_home_demo

End to end (all queries concurrently, pool of 8), median of 7: 28.4ms

### `select to_char(date_trunc('day', batch.created_at), 'YYYY-MM-DD') as day,`

Median client round trip over 7 runs: 4.7ms

```sql
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
where batch.organization_id = $1
  and batch.created_at >= $2::timestamp
  and trial.status in ('passed', 'failed')
group by 1, 2, 3
order by 1, 2, 3
```

Params: ["org_home_demo","2026-09-20T15:54:33.431Z"]

```
GroupAggregate  (cost=2497.79..2629.74 rows=2778 width=89) (actual time=3.348..3.509 rows=102.00 loops=1)
  Group Key: (to_char(date_trunc('day'::text, batch.created_at), 'YYYY-MM-DD'::text)), suite.id, ((((variant.harness || '/'::text) || variant.model) || COALESCE(('@'::text || variant.profile), ''::text)))
  Buffers: shared hit=1618
  ->  Sort  (cost=2497.79..2504.73 rows=2778 width=87) (actual time=3.340..3.368 rows=1276.00 loops=1)
        Sort Key: (to_char(date_trunc('day'::text, batch.created_at), 'YYYY-MM-DD'::text)), suite.id, ((((variant.harness || '/'::text) || variant.model) || COALESCE(('@'::text || variant.profile), ''::text)))
        Sort Method: quicksort  Memory: 137kB
        Buffers: shared hit=1618
        ->  Nested Loop  (cost=57.38..2338.89 rows=2778 width=87) (actual time=0.514..2.765 rows=1276.00 loops=1)
              Buffers: shared hit=1618
              ->  Hash Join  (cost=56.97..228.18 rows=749 width=82) (actual time=0.504..0.689 rows=336.00 loops=1)
                    Hash Cond: (c.suite_internal_id = suite.internal_id)
                    Buffers: shared hit=135
                    ->  Hash Join  (cost=55.02..224.07 rows=749 width=90) (actual time=0.492..0.639 rows=336.00 loops=1)
                          Hash Cond: (variant.case_internal_id = c.internal_id)
                          Buffers: shared hit=134
                          ->  Hash Join  (cost=45.07..212.12 rows=749 width=91) (actual time=0.464..0.572 rows=336.00 loops=1)
                                Hash Cond: (run.variant_internal_id = variant.internal_id)
                                Buffers: shared hit=129
                                ->  Hash Join  (cost=21.91..186.98 rows=749 width=74) (actual time=0.378..0.436 rows=336.00 loops=1)
                                      Hash Cond: (run.batch_internal_id = batch.internal_id)
                                      Buffers: shared hit=119
                                      ->  Seq Scan on eval_run run  (cost=0.00..153.14 rows=4514 width=81) (actual time=0.002..0.115 rows=4514.00 loops=1)
                                            Buffers: shared hit=108
                                      ->  Hash  (cost=20.59..20.59 rows=106 width=25) (actual time=0.031..0.032 rows=42.00 loops=1)
                                            Buckets: 1024  Batches: 1  Memory Usage: 11kB
                                            Buffers: shared hit=11
                                            ->  Seq Scan on eval_batch batch  (cost=0.00..20.59 rows=106 width=25) (actual time=0.025..0.028 rows=42.00 loops=1)
                                                  Filter: ((created_at >= '2026-09-20 15:54:33.431'::timestamp without time zone) AND (organization_id = 'org_home_demo'::text))
                                                  Rows Removed by Filter: 597
                                                  Buffers: shared hit=11
                                ->  Hash  (cost=15.85..15.85 rows=585 width=79) (actual time=0.085..0.085 rows=585.00 loops=1)
                                      Buckets: 1024  Batches: 1  Memory Usage: 70kB
                                      Buffers: shared hit=10
                                      ->  Seq Scan on eval_variant variant  (cost=0.00..15.85 rows=585 width=79) (actual time=0.002..0.038 rows=585.00 loops=1)
                                            Buffers: shared hit=10
                          ->  Hash  (cost=7.20..7.20 rows=220 width=52) (actual time=0.027..0.027 rows=220.00 loops=1)
                                Buckets: 1024  Batches: 1  Memory Usage: 27kB
                                Buffers: shared hit=5
                                ->  Seq Scan on eval_case c  (cost=0.00..7.20 rows=220 width=52) (actual time=0.002..0.015 rows=220.00 loops=1)
                                      Buffers: shared hit=5
                    ->  Hash  (cost=1.42..1.42 rows=42 width=45) (actual time=0.011..0.011 rows=42.00 loops=1)
                          Buckets: 1024  Batches: 1  Memory Usage: 12kB
                          Buffers: shared hit=1
                          ->  Seq Scan on eval_suite suite  (cost=0.00..1.42 rows=42 width=45) (actual time=0.005..0.007 rows=42.00 loops=1)
                                Buffers: shared hit=1
              ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial  (cost=0.41..2.72 rows=4 width=42) (actual time=0.005..0.005 rows=3.80 loops=336)
                    Index Cond: (run_internal_id = run.internal_id)
                    Filter: (status = ANY ('{passed,failed}'::text[]))
                    Rows Removed by Filter: 0
                    Index Searches: 336
                    Buffers: shared hit=1483
Planning:
  Buffers: shared hit=58
Planning Time: 0.744 ms
Execution Time: 3.537 ms
```

### `with scoped as (`

Median client round trip over 7 runs: 21.0ms

```sql
with scoped as (
  select c.id as case_id, c.name as case_name, s.id as suite_id, s.name as suite_name,
    v.internal_id as variant_id, v.harness as variant_harness, v.model as variant_model,
    v.sandbox as variant_sandbox, v.profile as variant_profile,
    v.user_model as variant_user_model
  from eval_case c
  join eval_suite s on s.internal_id = c.suite_internal_id
  join eval_variant v on v.case_internal_id = c.internal_id
  where c.organization_id = $1
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
    and newest.finished_at >= $2::timestamp
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
order by newest.suite_id, newest.case_id, newest.variant_id
```

Params: ["org_home_demo","2026-09-26T15:54:33.431Z"]

```
Sort  (cost=13276.46..13276.47 rows=4 width=352) (actual time=19.872..19.883 rows=473.00 loops=1)
  Sort Key: newest.suite_id, newest.case_id, newest.variant_id
  Sort Method: quicksort  Memory: 131kB
  Buffers: shared hit=14096
  ->  Nested Loop Left Join  (cost=86.18..13276.42 rows=4 width=352) (actual time=0.595..19.586 rows=473.00 loops=1)
        Join Filter: (newest.verdict = 'unscored'::text)
        Rows Removed by Join Filter: 69
        Buffers: shared hit=14096
        ->  Nested Loop Left Join  (cost=85.77..13212.51 rows=4 width=337) (actual time=0.587..17.190 rows=473.00 loops=1)
              Join Filter: (newest.verdict = ANY ('{failed,flaky}'::text[]))
              Buffers: shared hit=12029
              ->  Subquery Scan on newest  (cost=69.03..13145.47 rows=4 width=273) (actual time=0.581..13.753 rows=473.00 loops=1)
                    Filter: (newest."position" = 1)
                    Rows Removed by Filter: 450
                    Buffers: shared hit=9945
                    ->  WindowAgg  (cost=69.03..13134.84 rows=850 width=281) (actual time=0.580..13.717 rows=923.00 loops=1)
                          Window: w1 AS (PARTITION BY v.internal_id ORDER BY (row_number() OVER w1))
                          Storage: Memory  Maximum Storage: 17kB
                          Buffers: shared hit=9945
                          ->  Incremental Sort  (cost=69.03..13100.84 rows=850 width=217) (actual time=0.577..13.392 rows=923.00 loops=1)
                                Sort Key: v.internal_id, (row_number() OVER w1)
                                Presorted Key: v.internal_id
                                Full-sort Groups: 29  Sort Method: quicksort  Average Memory: 31kB  Peak Memory: 31kB
                                Buffers: shared hit=9945
                                ->  Nested Loop  (cost=46.76..13071.87 rows=850 width=217) (actual time=0.126..12.988 rows=923.00 loops=1)
                                      Buffers: shared hit=9945
                                      ->  Nested Loop  (cost=30.78..13002.70 rows=850 width=209) (actual time=0.118..6.292 rows=923.00 loops=1)
                                            Buffers: shared hit=5875
                                            ->  Nested Loop  (cost=0.71..190.00 rows=425 width=158) (actual time=0.100..1.046 rows=480.00 loops=1)
                                                  Buffers: shared hit=777
                                                  ->  Nested Loop  (cost=0.56..169.87 rows=425 width=153) (actual time=0.097..0.920 rows=480.00 loops=1)
                                                        Buffers: shared hit=767
                                                        ->  Index Scan using eval_variant_pkey on eval_variant v  (cost=0.28..76.33 rows=585 width=118) (actual time=0.003..0.082 rows=585.00 loops=1)
                                                              Index Searches: 1
                                                              Buffers: shared hit=107
                                                        ->  Memoize  (cost=0.28..0.37 rows=1 width=88) (actual time=0.001..0.001 rows=0.82 loops=585)
                                                              Cache Key: v.case_internal_id
                                                              Cache Mode: logical
                                                              Hits: 365  Misses: 220  Evictions: 0  Overflows: 0  Memory Usage: 39kB
                                                              Buffers: shared hit=660
                                                              ->  Index Scan using eval_case_pkey on eval_case c  (cost=0.27..0.36 rows=1 width=88) (actual time=0.003..0.003 rows=0.73 loops=220)
                                                                    Index Cond: (internal_id = v.case_internal_id)
                                                                    Filter: (organization_id = 'org_home_demo'::text)
                                                                    Rows Removed by Filter: 0
                                                                    Index Searches: 220
                                                                    Buffers: shared hit=660
                                                  ->  Memoize  (cost=0.15..0.24 rows=1 width=58) (actual time=0.000..0.000 rows=1.00 loops=480)
                                                        Cache Key: c.suite_internal_id
                                                        Cache Mode: logical
                                                        Hits: 475  Misses: 5  Evictions: 0  Overflows: 0  Memory Usage: 1kB
                                                        Buffers: shared hit=10
                                                        ->  Index Scan using eval_suite_pkey on eval_suite s  (cost=0.14..0.23 rows=1 width=58) (actual time=0.003..0.003 rows=1.00 loops=5)
                                                              Index Cond: (internal_id = c.suite_internal_id)
                                                              Index Searches: 5
                                                              Buffers: shared hit=10
                                            ->  Limit  (cost=30.07..30.11 rows=2 width=59) (actual time=0.011..0.011 rows=1.92 loops=480)
                                                  Buffers: shared hit=5098
                                                  ->  WindowAgg  (cost=30.07..30.21 rows=8 width=59) (actual time=0.010..0.011 rows=1.92 loops=480)
                                                        Window: w1 AS (ORDER BY run.created_at, run.internal_id ROWS UNBOUNDED PRECEDING)
                                                        Storage: Memory  Maximum Storage: 17kB
                                                        Buffers: shared hit=5098
                                                        ->  Sort  (cost=30.05..30.07 rows=8 width=51) (actual time=0.010..0.010 rows=1.92 loops=480)
                                                              Sort Key: run.created_at DESC, run.internal_id DESC
                                                              Sort Method: quicksort  Memory: 25kB
                                                              Buffers: shared hit=5098
                                                              ->  Bitmap Heap Scan on eval_run run  (cost=4.34..29.93 rows=8 width=51) (actual time=0.006..0.009 rows=9.00 loops=480)
                                                                    Recheck Cond: (variant_internal_id = v.internal_id)
                                                                    Filter: (status <> 'running'::text)
                                                                    Rows Removed by Filter: 0
                                                                    Heap Blocks: exact=4138
                                                                    Buffers: shared hit=5098
                                                                    ->  Bitmap Index Scan on eval_run_variant_internal_id_created_at_idx  (cost=0.00..4.34 rows=8 width=0) (actual time=0.005..0.005 rows=9.00 loops=480)
                                                                          Index Cond: (variant_internal_id = v.internal_id)
                                                                          Index Searches: 480
                                                                          Buffers: shared hit=960
                                      ->  Memoize  (cost=15.98..16.00 rows=1 width=8) (actual time=0.007..0.007 rows=1.00 loops=923)
                                            Cache Key: run.internal_id
                                            Cache Mode: binary
                                            Hits: 0  Misses: 923  Evictions: 0  Overflows: 0  Memory Usage: 127kB
                                            Buffers: shared hit=4070
                                            ->  Aggregate  (cost=15.97..15.99 rows=1 width=8) (actual time=0.007..0.007 rows=1.00 loops=923)
                                                  Buffers: shared hit=4070
                                                  ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial  (cost=0.41..15.93 rows=4 width=6) (actual time=0.005..0.006 rows=4.00 loops=923)
                                                        Index Cond: (run_internal_id = run.internal_id)
                                                        Index Searches: 923
                                                        Buffers: shared hit=4070
              ->  Limit  (cost=16.73..16.74 rows=1 width=69) (actual time=0.007..0.007 rows=0.20 loops=473)
                    Buffers: shared hit=2084
                    ->  Sort  (cost=16.73..16.74 rows=1 width=69) (actual time=0.007..0.007 rows=0.20 loops=473)
                          Sort Key: ((entry.value IS NULL)), trial_1.ordinal
                          Sort Method: quicksort  Memory: 25kB
                          Buffers: shared hit=2084
                          ->  Nested Loop Left Join  (cost=0.42..16.72 rows=1 width=69) (actual time=0.006..0.007 rows=0.27 loops=473)
                                Buffers: shared hit=2084
                                ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial_1  (cost=0.41..15.94 rows=1 width=949) (actual time=0.005..0.005 rows=0.27 loops=473)
                                      Index Cond: (run_internal_id = newest.run_id)
                                      Filter: (status = 'failed'::text)
                                      Rows Removed by Filter: 4
                                      Index Searches: 473
                                      Buffers: shared hit=2084
                                ->  Limit  (cost=0.01..0.76 rows=1 width=40) (actual time=0.005..0.005 rows=1.00 loops=126)
                                      ->  Function Scan on jsonb_array_elements entry  (cost=0.01..1.51 rows=2 width=40) (actual time=0.004..0.004 rows=1.00 loops=126)
                                            Filter: ((value ->> 'status'::text) = ANY ('{failed,error}'::text[]))
                                            Rows Removed by Filter: 1
        ->  Limit  (cost=0.41..15.94 rows=1 width=50) (actual time=0.005..0.005 rows=0.15 loops=473)
              Buffers: shared hit=2067
              ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial_2  (cost=0.41..15.94 rows=1 width=50) (actual time=0.005..0.005 rows=0.15 loops=473)
                    Index Cond: (run_internal_id = newest.run_id)
                    Filter: (status = 'void'::text)
                    Rows Removed by Filter: 4
                    Index Searches: 473
                    Buffers: shared hit=2067
Planning:
  Buffers: shared hit=20
Planning Time: 0.481 ms
Execution Time: 19.938 ms
```

### `select "internal_id", "organization_id", "trigger", "local", "status", "failure", "started`

Median client round trip over 7 runs: 0.2ms

```sql
select "internal_id", "organization_id", "trigger", "local", "status", "failure", "started_by", "created_at", "finished_at", "last_seen_at", "idempotency_key", "request_hash" from "eval_batch" where "eval_batch"."organization_id" = $1 order by "eval_batch"."created_at" desc, "eval_batch"."internal_id" desc limit $2
```

Params: ["org_home_demo",6]

```
Limit  (cost=28.67..28.68 rows=6 width=290) (actual time=0.065..0.066 rows=6.00 loops=1)
  Buffers: shared hit=11
  ->  Sort  (cost=28.67..30.02 rows=540 width=290) (actual time=0.065..0.066 rows=6.00 loops=1)
        Sort Key: created_at DESC, internal_id DESC
        Sort Method: top-N heapsort  Memory: 26kB
        Buffers: shared hit=11
        ->  Seq Scan on eval_batch  (cost=0.00..18.99 rows=540 width=290) (actual time=0.003..0.036 rows=540.00 loops=1)
              Filter: (organization_id = 'org_home_demo'::text)
              Rows Removed by Filter: 99
              Buffers: shared hit=11
Planning Time: 0.011 ms
Execution Time: 0.069 ms
```

### `select coalesce(sum(cost.amount_nanos), 0)::text as nanos`

Median client round trip over 7 runs: 5.6ms

```sql
select coalesce(sum(cost.amount_nanos), 0)::text as nanos
from eval_batch batch
join eval_run run on run.batch_internal_id = batch.internal_id
join eval_trial trial on trial.run_internal_id = run.internal_id
join eval_trial_cost cost on cost.trial_internal_id = trial.internal_id
where batch.organization_id = $1
  and batch.created_at >= $2::timestamp
  and cost.classification = 'estimate'
```

Params: ["org_home_demo","2026-09-20T15:54:33.431Z"]

```
Aggregate  (cost=3638.91..3638.92 rows=1 width=32) (actual time=5.484..5.485 rows=1.00 loops=1)
  Buffers: shared hit=2438
  ->  Hash Join  (cost=2284.87..3632.07 rows=2735 width=8) (actual time=5.168..5.453 rows=1275.00 loops=1)
        Hash Cond: (cost.trial_internal_id = trial.internal_id)
        Buffers: shared hit=2438
        ->  Seq Scan on eval_trial_cost cost  (cost=0.00..1258.04 rows=16484 width=46) (actual time=0.003..2.152 rows=16538.00 loops=1)
              Filter: (classification = 'estimate'::text)
              Rows Removed by Filter: 17225
              Buffers: shared hit=836
        ->  Hash  (cost=2248.53..2248.53 rows=2907 width=39) (actual time=2.344..2.345 rows=1344.00 loops=1)
              Buckets: 4096  Batches: 1  Memory Usage: 125kB
              Buffers: shared hit=1602
              ->  Nested Loop  (cost=22.32..2248.53 rows=2907 width=39) (actual time=0.408..2.251 rows=1344.00 loops=1)
                    Buffers: shared hit=1602
                    ->  Hash Join  (cost=21.91..186.98 rows=749 width=35) (actual time=0.400..0.446 rows=336.00 loops=1)
                          Hash Cond: (run.batch_internal_id = batch.internal_id)
                          Buffers: shared hit=119
                          ->  Seq Scan on eval_run run  (cost=0.00..153.14 rows=4514 width=50) (actual time=0.001..0.120 rows=4514.00 loops=1)
                                Buffers: shared hit=108
                          ->  Hash  (cost=20.59..20.59 rows=106 width=17) (actual time=0.031..0.031 rows=42.00 loops=1)
                                Buckets: 1024  Batches: 1  Memory Usage: 10kB
                                Buffers: shared hit=11
                                ->  Seq Scan on eval_batch batch  (cost=0.00..20.59 rows=106 width=17) (actual time=0.025..0.028 rows=42.00 loops=1)
                                      Filter: ((created_at >= '2026-09-20 15:54:33.431'::timestamp without time zone) AND (organization_id = 'org_home_demo'::text))
                                      Rows Removed by Filter: 597
                                      Buffers: shared hit=11
                    ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial  (cost=0.41..2.71 rows=4 width=75) (actual time=0.005..0.005 rows=4.00 loops=336)
                          Index Cond: (run_internal_id = run.internal_id)
                          Index Searches: 336
                          Buffers: shared hit=1483
Planning:
  Buffers: shared hit=42
Planning Time: 0.461 ms
Execution Time: 5.525 ms
```

### `select "eval_run"."batch_internal_id", count(distinct "eval_variant"."case_internal_id"), `

Median client round trip over 7 runs: 1.0ms

```sql
select "eval_run"."batch_internal_id", count(distinct "eval_variant"."case_internal_id"), count("eval_trial"."internal_id") filter (where "eval_trial"."status" = 'passed'), count(distinct "eval_run"."internal_id"), count("eval_trial"."internal_id") filter (where "eval_trial"."status" in ('passed', 'failed')), count("eval_trial"."internal_id") filter (where "eval_trial"."status" = 'void') from "eval_run" inner join "eval_variant" on "eval_variant"."internal_id" = "eval_run"."variant_internal_id" left join "eval_trial" on "eval_trial"."run_internal_id" = "eval_run"."internal_id" where "eval_run"."batch_internal_id" in ($1, $2, $3, $4, $5) group by "eval_run"."batch_internal_id"
```

Params: ["ebat_home_0_5","ebat_home_0_4","ebat_home_0_3","ebat_home_0_2","ebat_home_0_1"]

```
GroupAggregate  (cost=744.47..748.73 rows=39 width=55) (actual time=0.384..0.423 rows=5.00 loops=1)
  Group Key: eval_run.batch_internal_id
  Buffers: shared hit=191
  ->  Sort  (cost=744.47..744.86 rows=155 width=121) (actual time=0.373..0.376 rows=160.00 loops=1)
        Sort Key: eval_run.batch_internal_id, eval_variant.case_internal_id
        Sort Method: quicksort  Memory: 46kB
        Buffers: shared hit=191
        ->  Nested Loop Left Join  (cost=45.30..738.83 rows=155 width=121) (actual time=0.085..0.275 rows=160.00 loops=1)
              Buffers: shared hit=191
              ->  Hash Join  (cost=44.89..124.41 rows=40 width=76) (actual time=0.079..0.086 rows=40.00 loops=1)
                    Hash Cond: (eval_run.variant_internal_id = eval_variant.internal_id)
                    Buffers: shared hit=14
                    ->  Bitmap Heap Scan on eval_run  (cost=21.72..101.14 rows=40 width=81) (actual time=0.011..0.012 rows=40.00 loops=1)
                          Recheck Cond: (batch_internal_id = ANY ('{ebat_home_0_5,ebat_home_0_4,ebat_home_0_3,ebat_home_0_2,ebat_home_0_1}'::text[]))
                          Heap Blocks: exact=2
                          Buffers: shared hit=4
                          ->  Bitmap Index Scan on eval_run_batch_internal_id_variant_internal_id_idx  (cost=0.00..21.71 rows=40 width=0) (actual time=0.009..0.009 rows=40.00 loops=1)
                                Index Cond: (batch_internal_id = ANY ('{ebat_home_0_5,ebat_home_0_4,ebat_home_0_3,ebat_home_0_2,ebat_home_0_1}'::text[]))
                                Index Searches: 1
                                Buffers: shared hit=2
                    ->  Hash  (cost=15.85..15.85 rows=585 width=57) (actual time=0.066..0.067 rows=585.00 loops=1)
                          Buckets: 1024  Batches: 1  Memory Usage: 60kB
                          Buffers: shared hit=10
                          ->  Seq Scan on eval_variant  (cost=0.00..15.85 rows=585 width=57) (actual time=0.003..0.034 rows=585.00 loops=1)
                                Buffers: shared hit=10
              ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial  (cost=0.41..15.32 rows=4 width=81) (actual time=0.004..0.004 rows=4.00 loops=40)
                    Index Cond: (run_internal_id = eval_run.internal_id)
                    Index Searches: 40
                    Buffers: shared hit=177
Planning:
  Buffers: shared hit=26
Planning Time: 0.346 ms
Execution Time: 0.435 ms
```

### `select count(*) from "eval_batch" where "eval_batch"."organization_id" = $1`

Median client round trip over 7 runs: 0.3ms

```sql
select count(*) from "eval_batch" where "eval_batch"."organization_id" = $1
```

Params: ["org_home_demo"]

```
Aggregate  (cost=20.34..20.35 rows=1 width=8) (actual time=0.049..0.049 rows=1.00 loops=1)
  Buffers: shared hit=11
  ->  Seq Scan on eval_batch  (cost=0.00..18.99 rows=540 width=0) (actual time=0.004..0.037 rows=540.00 loops=1)
        Filter: (organization_id = 'org_home_demo'::text)
        Rows Removed by Filter: 99
        Buffers: shared hit=11
Planning Time: 0.011 ms
Execution Time: 0.052 ms
```

# Appendix G: eval_run index alone, after migration 0060 (scratch clone), 7d

## Range 7d, organization org_home_demo

End to end (all queries concurrently, pool of 8), median of 7: 23.3ms

### `select to_char(date_trunc('day', batch.created_at), 'YYYY-MM-DD') as day,`

Median client round trip over 7 runs: 8.5ms

```sql
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
where batch.organization_id = $1
  and batch.created_at >= $2::timestamp
  and trial.status in ('passed', 'failed')
group by 1, 2, 3
order by 1, 2, 3
```

Params: ["org_home_demo","2026-09-20T15:54:35.667Z"]

```
GroupAggregate  (cost=2497.79..2629.74 rows=2778 width=89) (actual time=3.569..3.734 rows=102.00 loops=1)
  Group Key: (to_char(date_trunc('day'::text, batch.created_at), 'YYYY-MM-DD'::text)), suite.id, ((((variant.harness || '/'::text) || variant.model) || COALESCE(('@'::text || variant.profile), ''::text)))
  Buffers: shared hit=1618
  ->  Sort  (cost=2497.79..2504.73 rows=2778 width=87) (actual time=3.562..3.589 rows=1276.00 loops=1)
        Sort Key: (to_char(date_trunc('day'::text, batch.created_at), 'YYYY-MM-DD'::text)), suite.id, ((((variant.harness || '/'::text) || variant.model) || COALESCE(('@'::text || variant.profile), ''::text)))
        Sort Method: quicksort  Memory: 137kB
        Buffers: shared hit=1618
        ->  Nested Loop  (cost=57.38..2338.89 rows=2778 width=87) (actual time=0.576..2.962 rows=1276.00 loops=1)
              Buffers: shared hit=1618
              ->  Hash Join  (cost=56.97..228.18 rows=749 width=82) (actual time=0.560..0.761 rows=336.00 loops=1)
                    Hash Cond: (c.suite_internal_id = suite.internal_id)
                    Buffers: shared hit=135
                    ->  Hash Join  (cost=55.02..224.07 rows=749 width=90) (actual time=0.547..0.712 rows=336.00 loops=1)
                          Hash Cond: (variant.case_internal_id = c.internal_id)
                          Buffers: shared hit=134
                          ->  Hash Join  (cost=45.07..212.12 rows=749 width=91) (actual time=0.517..0.639 rows=336.00 loops=1)
                                Hash Cond: (run.variant_internal_id = variant.internal_id)
                                Buffers: shared hit=129
                                ->  Hash Join  (cost=21.91..186.98 rows=749 width=74) (actual time=0.430..0.496 rows=336.00 loops=1)
                                      Hash Cond: (run.batch_internal_id = batch.internal_id)
                                      Buffers: shared hit=119
                                      ->  Seq Scan on eval_run run  (cost=0.00..153.14 rows=4514 width=81) (actual time=0.001..0.137 rows=4514.00 loops=1)
                                            Buffers: shared hit=108
                                      ->  Hash  (cost=20.59..20.59 rows=106 width=25) (actual time=0.033..0.034 rows=42.00 loops=1)
                                            Buckets: 1024  Batches: 1  Memory Usage: 11kB
                                            Buffers: shared hit=11
                                            ->  Seq Scan on eval_batch batch  (cost=0.00..20.59 rows=106 width=25) (actual time=0.028..0.031 rows=42.00 loops=1)
                                                  Filter: ((created_at >= '2026-09-20 15:54:35.667'::timestamp without time zone) AND (organization_id = 'org_home_demo'::text))
                                                  Rows Removed by Filter: 597
                                                  Buffers: shared hit=11
                                ->  Hash  (cost=15.85..15.85 rows=585 width=79) (actual time=0.085..0.086 rows=585.00 loops=1)
                                      Buckets: 1024  Batches: 1  Memory Usage: 70kB
                                      Buffers: shared hit=10
                                      ->  Seq Scan on eval_variant variant  (cost=0.00..15.85 rows=585 width=79) (actual time=0.002..0.037 rows=585.00 loops=1)
                                            Buffers: shared hit=10
                          ->  Hash  (cost=7.20..7.20 rows=220 width=52) (actual time=0.029..0.029 rows=220.00 loops=1)
                                Buckets: 1024  Batches: 1  Memory Usage: 27kB
                                Buffers: shared hit=5
                                ->  Seq Scan on eval_case c  (cost=0.00..7.20 rows=220 width=52) (actual time=0.002..0.015 rows=220.00 loops=1)
                                      Buffers: shared hit=5
                    ->  Hash  (cost=1.42..1.42 rows=42 width=45) (actual time=0.011..0.011 rows=42.00 loops=1)
                          Buckets: 1024  Batches: 1  Memory Usage: 12kB
                          Buffers: shared hit=1
                          ->  Seq Scan on eval_suite suite  (cost=0.00..1.42 rows=42 width=45) (actual time=0.004..0.006 rows=42.00 loops=1)
                                Buffers: shared hit=1
              ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial  (cost=0.41..2.72 rows=4 width=42) (actual time=0.005..0.006 rows=3.80 loops=336)
                    Index Cond: (run_internal_id = run.internal_id)
                    Filter: (status = ANY ('{passed,failed}'::text[]))
                    Rows Removed by Filter: 0
                    Index Searches: 336
                    Buffers: shared hit=1483
Planning:
  Buffers: shared hit=58
Planning Time: 0.884 ms
Execution Time: 3.765 ms
```

### `with scoped as (`

Median client round trip over 7 runs: 19.7ms

```sql
with scoped as (
  select c.id as case_id, c.name as case_name, s.id as suite_id, s.name as suite_name,
    v.internal_id as variant_id, v.harness as variant_harness, v.model as variant_model,
    v.sandbox as variant_sandbox, v.profile as variant_profile,
    v.user_model as variant_user_model
  from eval_case c
  join eval_suite s on s.internal_id = c.suite_internal_id
  join eval_variant v on v.case_internal_id = c.internal_id
  where c.organization_id = $1
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
    and newest.finished_at >= $2::timestamp
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
order by newest.suite_id, newest.case_id, newest.variant_id
```

Params: ["org_home_demo","2026-09-26T15:54:35.667Z"]

```
Sort  (cost=13276.46..13276.47 rows=4 width=352) (actual time=18.855..18.865 rows=473.00 loops=1)
  Sort Key: newest.suite_id, newest.case_id, newest.variant_id
  Sort Method: quicksort  Memory: 131kB
  Buffers: shared hit=14144
  ->  Nested Loop Left Join  (cost=86.18..13276.42 rows=4 width=352) (actual time=0.597..18.582 rows=473.00 loops=1)
        Join Filter: (newest.verdict = 'unscored'::text)
        Rows Removed by Join Filter: 69
        Buffers: shared hit=14144
        ->  Nested Loop Left Join  (cost=85.77..13212.51 rows=4 width=337) (actual time=0.589..16.279 rows=473.00 loops=1)
              Join Filter: (newest.verdict = ANY ('{failed,flaky}'::text[]))
              Buffers: shared hit=12077
              ->  Subquery Scan on newest  (cost=69.03..13145.47 rows=4 width=273) (actual time=0.582..13.045 rows=473.00 loops=1)
                    Filter: (newest."position" = 1)
                    Rows Removed by Filter: 450
                    Buffers: shared hit=9993
                    ->  WindowAgg  (cost=69.03..13134.84 rows=850 width=281) (actual time=0.581..13.015 rows=923.00 loops=1)
                          Window: w1 AS (PARTITION BY v.internal_id ORDER BY (row_number() OVER w1))
                          Storage: Memory  Maximum Storage: 17kB
                          Buffers: shared hit=9993
                          ->  Incremental Sort  (cost=69.03..13100.84 rows=850 width=217) (actual time=0.578..12.722 rows=923.00 loops=1)
                                Sort Key: v.internal_id, (row_number() OVER w1)
                                Presorted Key: v.internal_id
                                Full-sort Groups: 29  Sort Method: quicksort  Average Memory: 31kB  Peak Memory: 31kB
                                Buffers: shared hit=9993
                                ->  Nested Loop  (cost=46.76..13071.87 rows=850 width=217) (actual time=0.126..12.367 rows=923.00 loops=1)
                                      Buffers: shared hit=9993
                                      ->  Nested Loop  (cost=30.78..13002.70 rows=850 width=209) (actual time=0.116..6.076 rows=923.00 loops=1)
                                            Buffers: shared hit=5923
                                            ->  Nested Loop  (cost=0.71..190.00 rows=425 width=158) (actual time=0.094..1.022 rows=480.00 loops=1)
                                                  Buffers: shared hit=777
                                                  ->  Nested Loop  (cost=0.56..169.87 rows=425 width=153) (actual time=0.091..0.902 rows=480.00 loops=1)
                                                        Buffers: shared hit=767
                                                        ->  Index Scan using eval_variant_pkey on eval_variant v  (cost=0.28..76.33 rows=585 width=118) (actual time=0.003..0.075 rows=585.00 loops=1)
                                                              Index Searches: 1
                                                              Buffers: shared hit=107
                                                        ->  Memoize  (cost=0.28..0.37 rows=1 width=88) (actual time=0.001..0.001 rows=0.82 loops=585)
                                                              Cache Key: v.case_internal_id
                                                              Cache Mode: logical
                                                              Hits: 365  Misses: 220  Evictions: 0  Overflows: 0  Memory Usage: 39kB
                                                              Buffers: shared hit=660
                                                              ->  Index Scan using eval_case_pkey on eval_case c  (cost=0.27..0.36 rows=1 width=88) (actual time=0.003..0.003 rows=0.73 loops=220)
                                                                    Index Cond: (internal_id = v.case_internal_id)
                                                                    Filter: (organization_id = 'org_home_demo'::text)
                                                                    Rows Removed by Filter: 0
                                                                    Index Searches: 220
                                                                    Buffers: shared hit=660
                                                  ->  Memoize  (cost=0.15..0.24 rows=1 width=58) (actual time=0.000..0.000 rows=1.00 loops=480)
                                                        Cache Key: c.suite_internal_id
                                                        Cache Mode: logical
                                                        Hits: 475  Misses: 5  Evictions: 0  Overflows: 0  Memory Usage: 1kB
                                                        Buffers: shared hit=10
                                                        ->  Index Scan using eval_suite_pkey on eval_suite s  (cost=0.14..0.23 rows=1 width=58) (actual time=0.003..0.003 rows=1.00 loops=5)
                                                              Index Cond: (internal_id = c.suite_internal_id)
                                                              Index Searches: 5
                                                              Buffers: shared hit=10
                                            ->  Limit  (cost=30.07..30.11 rows=2 width=59) (actual time=0.010..0.010 rows=1.92 loops=480)
                                                  Buffers: shared hit=5146
                                                  ->  WindowAgg  (cost=30.07..30.21 rows=8 width=59) (actual time=0.010..0.010 rows=1.92 loops=480)
                                                        Window: w1 AS (ORDER BY run.created_at, run.internal_id ROWS UNBOUNDED PRECEDING)
                                                        Storage: Memory  Maximum Storage: 17kB
                                                        Buffers: shared hit=5146
                                                        ->  Sort  (cost=30.05..30.07 rows=8 width=51) (actual time=0.010..0.010 rows=1.92 loops=480)
                                                              Sort Key: run.created_at DESC, run.internal_id DESC
                                                              Sort Method: quicksort  Memory: 25kB
                                                              Buffers: shared hit=5146
                                                              ->  Bitmap Heap Scan on eval_run run  (cost=4.34..29.93 rows=8 width=51) (actual time=0.006..0.008 rows=9.00 loops=480)
                                                                    Recheck Cond: (variant_internal_id = v.internal_id)
                                                                    Filter: (status <> 'running'::text)
                                                                    Rows Removed by Filter: 0
                                                                    Heap Blocks: exact=4138
                                                                    Buffers: shared hit=5146
                                                                    ->  Bitmap Index Scan on eval_run_variant_internal_id_created_at_internal_id_idx  (cost=0.00..4.34 rows=8 width=0) (actual time=0.005..0.005 rows=9.00 loops=480)
                                                                          Index Cond: (variant_internal_id = v.internal_id)
                                                                          Index Searches: 480
                                                                          Buffers: shared hit=1008
                                      ->  Memoize  (cost=15.98..16.00 rows=1 width=8) (actual time=0.007..0.007 rows=1.00 loops=923)
                                            Cache Key: run.internal_id
                                            Cache Mode: binary
                                            Hits: 0  Misses: 923  Evictions: 0  Overflows: 0  Memory Usage: 127kB
                                            Buffers: shared hit=4070
                                            ->  Aggregate  (cost=15.97..15.99 rows=1 width=8) (actual time=0.006..0.006 rows=1.00 loops=923)
                                                  Buffers: shared hit=4070
                                                  ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial  (cost=0.41..15.93 rows=4 width=6) (actual time=0.005..0.006 rows=4.00 loops=923)
                                                        Index Cond: (run_internal_id = run.internal_id)
                                                        Index Searches: 923
                                                        Buffers: shared hit=4070
              ->  Limit  (cost=16.73..16.74 rows=1 width=69) (actual time=0.007..0.007 rows=0.20 loops=473)
                    Buffers: shared hit=2084
                    ->  Sort  (cost=16.73..16.74 rows=1 width=69) (actual time=0.007..0.007 rows=0.20 loops=473)
                          Sort Key: ((entry.value IS NULL)), trial_1.ordinal
                          Sort Method: quicksort  Memory: 25kB
                          Buffers: shared hit=2084
                          ->  Nested Loop Left Join  (cost=0.42..16.72 rows=1 width=69) (actual time=0.006..0.006 rows=0.27 loops=473)
                                Buffers: shared hit=2084
                                ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial_1  (cost=0.41..15.94 rows=1 width=949) (actual time=0.005..0.005 rows=0.27 loops=473)
                                      Index Cond: (run_internal_id = newest.run_id)
                                      Filter: (status = 'failed'::text)
                                      Rows Removed by Filter: 4
                                      Index Searches: 473
                                      Buffers: shared hit=2084
                                ->  Limit  (cost=0.01..0.76 rows=1 width=40) (actual time=0.004..0.004 rows=1.00 loops=126)
                                      ->  Function Scan on jsonb_array_elements entry  (cost=0.01..1.51 rows=2 width=40) (actual time=0.004..0.004 rows=1.00 loops=126)
                                            Filter: ((value ->> 'status'::text) = ANY ('{failed,error}'::text[]))
                                            Rows Removed by Filter: 1
        ->  Limit  (cost=0.41..15.94 rows=1 width=50) (actual time=0.005..0.005 rows=0.15 loops=473)
              Buffers: shared hit=2067
              ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial_2  (cost=0.41..15.94 rows=1 width=50) (actual time=0.004..0.004 rows=0.15 loops=473)
                    Index Cond: (run_internal_id = newest.run_id)
                    Filter: (status = 'void'::text)
                    Rows Removed by Filter: 4
                    Index Searches: 473
                    Buffers: shared hit=2067
Planning:
  Buffers: shared hit=20
Planning Time: 0.544 ms
Execution Time: 18.917 ms
```

### `select "internal_id", "organization_id", "trigger", "local", "status", "failure", "started`

Median client round trip over 7 runs: 0.2ms

```sql
select "internal_id", "organization_id", "trigger", "local", "status", "failure", "started_by", "created_at", "finished_at", "last_seen_at", "idempotency_key", "request_hash" from "eval_batch" where "eval_batch"."organization_id" = $1 order by "eval_batch"."created_at" desc, "eval_batch"."internal_id" desc limit $2
```

Params: ["org_home_demo",6]

```
Limit  (cost=28.67..28.68 rows=6 width=290) (actual time=0.061..0.062 rows=6.00 loops=1)
  Buffers: shared hit=11
  ->  Sort  (cost=28.67..30.02 rows=540 width=290) (actual time=0.061..0.061 rows=6.00 loops=1)
        Sort Key: created_at DESC, internal_id DESC
        Sort Method: top-N heapsort  Memory: 26kB
        Buffers: shared hit=11
        ->  Seq Scan on eval_batch  (cost=0.00..18.99 rows=540 width=290) (actual time=0.003..0.037 rows=540.00 loops=1)
              Filter: (organization_id = 'org_home_demo'::text)
              Rows Removed by Filter: 99
              Buffers: shared hit=11
Planning Time: 0.011 ms
Execution Time: 0.065 ms
```

### `select coalesce(sum(cost.amount_nanos), 0)::text as nanos`

Median client round trip over 7 runs: 5.5ms

```sql
select coalesce(sum(cost.amount_nanos), 0)::text as nanos
from eval_batch batch
join eval_run run on run.batch_internal_id = batch.internal_id
join eval_trial trial on trial.run_internal_id = run.internal_id
join eval_trial_cost cost on cost.trial_internal_id = trial.internal_id
where batch.organization_id = $1
  and batch.created_at >= $2::timestamp
  and cost.classification = 'estimate'
```

Params: ["org_home_demo","2026-09-20T15:54:35.667Z"]

```
Aggregate  (cost=3638.91..3638.92 rows=1 width=32) (actual time=5.213..5.214 rows=1.00 loops=1)
  Buffers: shared hit=2438
  ->  Hash Join  (cost=2284.87..3632.07 rows=2735 width=8) (actual time=4.889..5.170 rows=1275.00 loops=1)
        Hash Cond: (cost.trial_internal_id = trial.internal_id)
        Buffers: shared hit=2438
        ->  Seq Scan on eval_trial_cost cost  (cost=0.00..1258.04 rows=16484 width=46) (actual time=0.004..2.026 rows=16538.00 loops=1)
              Filter: (classification = 'estimate'::text)
              Rows Removed by Filter: 17225
              Buffers: shared hit=836
        ->  Hash  (cost=2248.53..2248.53 rows=2907 width=39) (actual time=2.303..2.304 rows=1344.00 loops=1)
              Buckets: 4096  Batches: 1  Memory Usage: 125kB
              Buffers: shared hit=1602
              ->  Nested Loop  (cost=22.32..2248.53 rows=2907 width=39) (actual time=0.404..2.212 rows=1344.00 loops=1)
                    Buffers: shared hit=1602
                    ->  Hash Join  (cost=21.91..186.98 rows=749 width=35) (actual time=0.397..0.447 rows=336.00 loops=1)
                          Hash Cond: (run.batch_internal_id = batch.internal_id)
                          Buffers: shared hit=119
                          ->  Seq Scan on eval_run run  (cost=0.00..153.14 rows=4514 width=50) (actual time=0.001..0.119 rows=4514.00 loops=1)
                                Buffers: shared hit=108
                          ->  Hash  (cost=20.59..20.59 rows=106 width=17) (actual time=0.031..0.031 rows=42.00 loops=1)
                                Buckets: 1024  Batches: 1  Memory Usage: 10kB
                                Buffers: shared hit=11
                                ->  Seq Scan on eval_batch batch  (cost=0.00..20.59 rows=106 width=17) (actual time=0.026..0.028 rows=42.00 loops=1)
                                      Filter: ((created_at >= '2026-09-20 15:54:35.667'::timestamp without time zone) AND (organization_id = 'org_home_demo'::text))
                                      Rows Removed by Filter: 597
                                      Buffers: shared hit=11
                    ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial trial  (cost=0.41..2.71 rows=4 width=75) (actual time=0.004..0.005 rows=4.00 loops=336)
                          Index Cond: (run_internal_id = run.internal_id)
                          Index Searches: 336
                          Buffers: shared hit=1483
Planning:
  Buffers: shared hit=42
Planning Time: 0.450 ms
Execution Time: 5.228 ms
```

### `select "eval_run"."batch_internal_id", count(distinct "eval_variant"."case_internal_id"), `

Median client round trip over 7 runs: 1.0ms

```sql
select "eval_run"."batch_internal_id", count(distinct "eval_variant"."case_internal_id"), count("eval_trial"."internal_id") filter (where "eval_trial"."status" = 'passed'), count(distinct "eval_run"."internal_id"), count("eval_trial"."internal_id") filter (where "eval_trial"."status" in ('passed', 'failed')), count("eval_trial"."internal_id") filter (where "eval_trial"."status" = 'void') from "eval_run" inner join "eval_variant" on "eval_variant"."internal_id" = "eval_run"."variant_internal_id" left join "eval_trial" on "eval_trial"."run_internal_id" = "eval_run"."internal_id" where "eval_run"."batch_internal_id" in ($1, $2, $3, $4, $5) group by "eval_run"."batch_internal_id"
```

Params: ["ebat_home_0_5","ebat_home_0_4","ebat_home_0_3","ebat_home_0_2","ebat_home_0_1"]

```
GroupAggregate  (cost=744.47..748.73 rows=39 width=55) (actual time=0.384..0.423 rows=5.00 loops=1)
  Group Key: eval_run.batch_internal_id
  Buffers: shared hit=191
  ->  Sort  (cost=744.47..744.86 rows=155 width=121) (actual time=0.374..0.378 rows=160.00 loops=1)
        Sort Key: eval_run.batch_internal_id, eval_variant.case_internal_id
        Sort Method: quicksort  Memory: 46kB
        Buffers: shared hit=191
        ->  Nested Loop Left Join  (cost=45.30..738.83 rows=155 width=121) (actual time=0.083..0.278 rows=160.00 loops=1)
              Buffers: shared hit=191
              ->  Hash Join  (cost=44.89..124.41 rows=40 width=76) (actual time=0.077..0.084 rows=40.00 loops=1)
                    Hash Cond: (eval_run.variant_internal_id = eval_variant.internal_id)
                    Buffers: shared hit=14
                    ->  Bitmap Heap Scan on eval_run  (cost=21.72..101.14 rows=40 width=81) (actual time=0.011..0.012 rows=40.00 loops=1)
                          Recheck Cond: (batch_internal_id = ANY ('{ebat_home_0_5,ebat_home_0_4,ebat_home_0_3,ebat_home_0_2,ebat_home_0_1}'::text[]))
                          Heap Blocks: exact=2
                          Buffers: shared hit=4
                          ->  Bitmap Index Scan on eval_run_batch_internal_id_variant_internal_id_idx  (cost=0.00..21.71 rows=40 width=0) (actual time=0.009..0.009 rows=40.00 loops=1)
                                Index Cond: (batch_internal_id = ANY ('{ebat_home_0_5,ebat_home_0_4,ebat_home_0_3,ebat_home_0_2,ebat_home_0_1}'::text[]))
                                Index Searches: 1
                                Buffers: shared hit=2
                    ->  Hash  (cost=15.85..15.85 rows=585 width=57) (actual time=0.065..0.065 rows=585.00 loops=1)
                          Buckets: 1024  Batches: 1  Memory Usage: 60kB
                          Buffers: shared hit=10
                          ->  Seq Scan on eval_variant  (cost=0.00..15.85 rows=585 width=57) (actual time=0.003..0.035 rows=585.00 loops=1)
                                Buffers: shared hit=10
              ->  Index Scan using eval_trial_run_internal_id_ordinal_idx on eval_trial  (cost=0.41..15.32 rows=4 width=81) (actual time=0.004..0.004 rows=4.00 loops=40)
                    Index Cond: (run_internal_id = eval_run.internal_id)
                    Index Searches: 40
                    Buffers: shared hit=177
Planning:
  Buffers: shared hit=26
Planning Time: 0.366 ms
Execution Time: 0.437 ms
```

### `select count(*) from "eval_batch" where "eval_batch"."organization_id" = $1`

Median client round trip over 7 runs: 0.2ms

```sql
select count(*) from "eval_batch" where "eval_batch"."organization_id" = $1
```

Params: ["org_home_demo"]

```
Aggregate  (cost=20.34..20.35 rows=1 width=8) (actual time=0.051..0.051 rows=1.00 loops=1)
  Buffers: shared hit=11
  ->  Seq Scan on eval_batch  (cost=0.00..18.99 rows=540 width=0) (actual time=0.003..0.039 rows=540.00 loops=1)
        Filter: (organization_id = 'org_home_demo'::text)
        Rows Removed by Filter: 99
        Buffers: shared hit=11
Planning Time: 0.009 ms
Execution Time: 0.054 ms
```

