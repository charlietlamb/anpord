# Performance

Server, runner and web numbers, recorded the same way every time and compared with a 5% threshold. `apps/perf/README.md` owns the commands, the metrics and how a regression is judged.

## Driving it

Preconditions: a local Postgres, and Chrome for the web suite (so for `all`). Keep other heavy work off the machine if you can.

- **Measure.** `bun run perf server` prints a table and the file it wrote.
- **Compare.** `bun run perf compare <before> <after>` exits `0` with `0 regressed beyond 5%`, or `1` with the rows that regressed.
- **Side by side.** `bun run perf ab all --before <base checkout>` ends with `N regressed beyond 5%`, or `N regressed over both passes` when a first pass flagged anything.

## Gotchas

- Numbers from another machine are not comparable. A result's `host` field says where it ran.
- Other agents building or testing on the machine inflate latencies. Prefer `ab`, which spreads that load over both sides.
- `--quick` results only compare with other `--quick` results.
