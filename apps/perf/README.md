# @sphynx/perf

Measures the server, the eval runner and the web app the same way every time, so a change is judged by numbers rather than by feel. Each run writes one JSON file and prints a table.

```bash
bun run perf server                 # hot API endpoints under load, cold start, memory
bun run perf runner                 # a local trial end to end and per step
bun run perf web                    # Lighthouse, bundle bytes, heap per page
bun run perf all --quick            # all three, smaller data and fewer samples

bun run perf compare before.json after.json            # exits 1 on any regression over 5%
bun run perf compare a1.json,a2.json b1.json,b2.json   # several runs per side, pooled by median
bun run perf ab all --before ../sphynx-base            # both checkouts side by side, then compare
```

Run it from the repository root. Results land in `apps/perf/results/` (ignored by git) unless `--out` names a file. `--json` prints only the result JSON on stdout. `--only runs.get,api.batch` limits the server suite to those endpoints, and an unknown name fails the run. `--target <checkout>` (and `ab`'s `--before` and `--after`, which defaults to this checkout) runs another checkout's server, migrations, web build and SDK while the harness stays here. The two checkouts must be different directories.

## Comparing a branch against its base

```bash
git worktree add --detach ../sphynx-base origin/<PR base branch> && (cd ../sphynx-base && bun install)
bun run perf ab all --before ../sphynx-base
```

`ab` boots both checkouts at once, each on its own scratch database with the same seeded data, and alternates between them (A B, then B A) for every endpoint, trial and page, so background load lands on both sides. Two runs taken apart are not comparable: main against main 20 minutes apart showed 54 latency "regressions".

A metric regresses when it moves the wrong way by more than the threshold (`--threshold`, default 5), by more than a noise floor per unit (1 ms, 1 KiB, half a query, 1 request per second, 2 Lighthouse points, 0.001 of a ratio), and past the before side's worst round when it has at least 3. Improvements are judged the same way in reverse. Metrics only one side has are added or removed. `info` metrics (seed time, server memory, `p99_ms`, each step's `first_ms`, web build time) never fail, because they rest on one sample or move over 10% main against main.

A single `ab all` pass flags about 1% of gated metrics main against main. So when a pass flags anything, `ab` measures those suites again and judges both passes pooled: the median per side against the widest spread either pass recorded. `compare` pools several files per side the same way.

## What each suite does

**Server.** Creates `sphynx_scratch_perf_server_<pid>_<n>` (checked with `testDatabaseUrl`) on the local Postgres from `.env.local`, `PERF_DATABASE_URL` or `localhost:5432`, migrates it and starts the real server. Two organizations are seeded through SQL, then one is filled through the runner API: 6 suites of 10 cases on 3 variants and 3 trials, 3 batches per suite, 40 journal events per trial, one trial with a 4,000 event journal, and 20 prompts. Each endpoint gets 20 warmup requests, then 5 rounds of 10 sequential requests (`c1_p50_ms`, `queries_per_request`) and 60 at concurrency 8 (`p50_ms`, `p95_ms`, `p99_ms`, `rps`, `error_rate`, `response_bytes`). A latency metric is the median of its rounds, and the rounds are its spread. Any failed request stops the run. `runner.start` runs at concurrency 2 and finishes each batch it starts, since an organization holds at most 3 open batches. `runner.report` fills one of 300 trial slots per request, so a full run caps it at 10 warmup and 5 rounds of 4 sequential and 54 concurrent requests.

A Bun preload (`src/stack/probe-preload.ts`) counts `pg` queries and reads memory inside the server process and serves both on a side port. Cold start is spawn to the first 200 from `/api/healthz`, 5 times.

**Runner.** Runs `scripts/fixtures/local-smoke` and `apps/perf/fixtures/runner-bench` (three cases with a prepare step, a code validator and an in-process fake OpenAI judge, 3 trials) on the local sandbox with the command harness. Every Effect span is recorded, so each step has a `first_ms` (informational) and a median over the rest. Each `runner.report` is timed, and the smoke fixture also runs through the CLI as a fresh process (`cli_wall_ms`). No model is called.

**Web.** Builds `apps/web`, serves it with `node .output/server/index.mjs`, and launches its own headless Chrome with a fresh profile and one signed in context per checkout. Pages are `/evals`, a batch, a case, the 4,000 event trial and `/settings`. Each gets one warmup and 3 Lighthouse runs (mobile throttling, cleared cache): score, LCP, FCP, TBT, CLS, TTFB, script and style bytes. The large trial is opened 3 more times for JS heap after GC, heap snapshot size and DOM nodes. A page that lands on login, or a trial page without the seeded journal, fails the run. The local server does not compress, so `js_transfer_bytes` is close to `js_bytes`.
