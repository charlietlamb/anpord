# @anpord/perf

Measures the server, the eval runner, and the web app the same way every time, so a change can be judged by numbers rather than by feel. Every run writes one JSON file and prints a table. Two sets of files compare with a regression threshold.

```bash
bun run perf server                 # hot API endpoints under load, cold start, memory
bun run perf runner                 # a local trial end to end and per step
bun run perf web                    # Lighthouse, bundle bytes, heap per page
bun run perf all                    # all three into one file
bun run perf all --quick            # smaller data and fewer samples, for a fast check

bun run perf compare before.json after.json            # exits 1 on any regression over 5%
bun run perf compare a1.json,a2.json b1.json,b2.json   # several runs per side, pooled by median
bun run perf ab all --before ../main-checkout          # both checkouts side by side, interleaved, then compare
```

Run it from the repository root. Results land in `apps/perf/results/` (ignored by git) unless `--out` names a file. `--json` prints the result instead of the table. `--only runs.get,api.batch` limits the server suite to those endpoints.

## Comparing a branch against main

Use `ab`. It boots both checkouts at once, each on its own scratch database seeded with the same data, and alternates between them in small blocks (A B, then B A, then A B) for every endpoint, every trial and every page. Whatever else the machine is doing lands on both sides, which is what makes a 5% threshold meaningful on a shared machine. Two separate runs compared later are not: on this machine, main against main taken 20 minutes apart showed 54 latency "regressions".

```bash
git worktree add --detach ../anpord-main origin/main && (cd ../anpord-main && bun install)
bun run perf ab all --before ../anpord-main           # --after defaults to this checkout
```

`--target <checkout>` (and `ab`'s `--before` and `--after`) point the suites at another checkout's code while the harness itself stays in this one. The server is started from that checkout's `apps/server`, migrations come from its `packages/db`, the web build is its `apps/web`, and the runner imports its `packages/sdk`. The two checkouts must be different directories, since each builds its own `apps/web`.

A metric regresses when all three hold: it moves the wrong way by more than the threshold (`--threshold`, default 5), by more than a noise floor per unit (1 ms, 1 KiB, half a query, one request per second, 2 Lighthouse points, 0.001 of a ratio), and past the worst value the before side recorded across its own rounds when it has at least 3. Improvements are judged the same way in the other direction. Metrics only one side has are listed as added or removed. Metrics marked `info` (seed time, server memory, `p99_ms`, each step's `first_ms`, web build time) are shown but never fail, because main against main moves them by more than 10% or they rest on a single sample.

Main against main through `ab all` flags about 3 of the 252 gated metrics (1%), almost always a latency percentile. So when a pass flags anything, `ab` measures the flagged suites again and judges both passes pooled: the median of the two values per side, against the widest spread either pass recorded. One noisy pass can neither fail a change nor clear it. `compare` accepts several files per side and pools them the same way.

## What each suite does

**Server.** Creates a scratch database named `anpord_scratch_perf_server_<pid>` on the local Postgres from `.env.local` (or `PERF_DATABASE_URL`, or `localhost:5432`), migrates it, and starts the real server against it. Two organizations are seeded through SQL, then a deterministic generator fills one through the real runner API: 6 suites of 10 cases on 3 variants and 3 trials, 3 batches per suite, 40 journal events per trial, one trial with a 4,000 event journal, and 20 prompts. Each endpoint gets 20 warmup requests, then 5 rounds of 10 sequential requests (`c1_p50_ms`, `queries_per_request`) and 60 requests at concurrency 8 (`p50_ms`, `p95_ms`, `p99_ms`, `rps`, `error_rate`, `response_bytes`). A latency metric is the median of its per round values, and the rounds are its spread. `p99_ms` is informational, since 60 requests a round make it the slowest one. Any failed request stops the run, so a broken endpoint cannot pass as a fast one. `runner.start` runs at concurrency 2 and finishes each batch it starts, because an organization may only hold 3 batches open. Its `rps` therefore includes that finish.

Queries are counted by a Bun preload (`src/stack/probe-preload.ts`) that wraps `pg`'s `Client.query` inside the server process and reports the count and memory on a side port. Nothing in the server changes for it. Cold start is spawn to the first 200 from `/api/healthz`, measured 5 times against the seeded database.

**Runner.** Starts a server on a scratch database, then runs two fixtures on the local sandbox with the command harness: `scripts/fixtures/local-smoke` and `apps/perf/fixtures/runner-bench` (three cases with a prepare step, a code validator, and an OpenAI judge answered by an in-process fake, 3 trials). Every Effect span the eval code opens is recorded, so each step (`SandboxProvider.open`, `Workspace.prepare`, `Command.run`, `Scorer.score`, `Judge.evaluate`, `LocalTrials.run`, and the rest) has a `first_ms` (the first time in the process, before anything is cached, informational since it is one sample) and a median over the rest. Each trial is reported to the server with `runner.report` and timed. The smoke fixture also runs through the CLI as a fresh process (`cli_wall_ms`). No model is called.

**Web.** Seeds a server as above, builds `apps/web`, serves it with `node .output/server/index.mjs`, and launches its own headless Chrome with a fresh temporary profile (never a signed in one). Each checkout gets its own browser context holding its session cookie, so two checkouts never see each other's cookies. Each page gets one warmup audit and 3 measured Lighthouse runs with the default mobile throttling and a cleared cache: score, LCP, FCP, TBT, CLS, TTFB, and script and style bytes. INP needs a real interaction, so TBT stands in for it. The large trial is then opened 3 times to read the JS heap after a GC, the heap snapshot size, and the DOM node count. A page that redirects to login fails the run, and so does a trial page that does not show the seeded journal. The local web server does not compress, so `js_transfer_bytes` is close to `js_bytes`.

Pages: `/evals`, a batch, a case, the trial with the 4,000 event journal, and `/settings`.

## Baselines

`baselines/` holds committed results from `main`. Compare a branch against the newest one only when the machine is the one that recorded it (the `host` field says which), and prefer `ab` otherwise.
