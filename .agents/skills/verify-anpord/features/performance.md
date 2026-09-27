# Performance

Numbers for the server, the eval runner and the web app, recorded the same way every time and compared with a 5% threshold.

## Sub-features

- `perf-server` latency percentiles, throughput, errors and queries per request for each endpoint, plus peak memory over the whole suite and cold start.
- `perf-runner` wall time per eval step and per trial, report latency, tokens.
- `perf-web` Lighthouse metrics, bundle bytes per page, heap after opening a long trial.
- `perf-compare` judges two sets of results; `perf-ab` runs the PR's base and the branch side by side and judges them.

## How to get to it (user POV)

- `bun run perf <server|runner|web|all>` from the repository root.
- `bun run perf ab all --before <base checkout>` for a branch versus its PR base.

## Driving it with the perf harness

Preconditions:

- A local Postgres. The web suite, and so `all`, also needs a Chrome install. Nothing else running heavy work, if you can help it.

- **Measure.** `bun run perf server`. The table prints per endpoint rows and the file path it wrote.
- **Compare.** `bun run perf compare apps/perf/baselines/<main file> <your file>`. Exit code `0` with `0 regressed beyond 5%`, or `1` with the rows that regressed.
- **Side by side.** `bun run perf ab all --before <base checkout>`. Boots both checkouts at once, alternates between them for every endpoint, trial and page, writes `before.json` and `after.json`, then compares them. Exit code `1` names what regressed.
- **Confirmation.** When the first pass flags anything, `ab` measures those suites again and ends with `N regressed over both passes`, judged on both passes pooled. About 1% of gated metrics flag in a single pass on main against main.

## Gotchas

- Numbers from another machine are not comparable. The `host` field of a result says where it ran.
- Other agents building or testing on the same machine inflate latencies. Prefer `ab`, which spreads that load over both sides.
- `--quick` results only compare with other `--quick` results.
