# Runner and read API

The SDK and CLI start batches, report trials and read results through `/v1`. The dashboard reads the same data through `/api/evals`.

## Sub-features

- `runner-start` starts a batch and answers with a run per case and variant.
- `runner-report` records one trial's journal and outcome.
- `runner-tail` streams a batch's journal from given marks.
- `reads` returns batches, runs, cases, suites and trials.

## How to get to it (user POV)

- The CLI and SDK call these on the user's behalf.
- The dashboard's eval pages call the `/api/evals` twins.

## Driving it with fetch

Preconditions:

- A server you started on a scratch database, and an API key for a seeded organization.

- **Start.** `POST /v1/runner.start` with a compiled suite, `local: true`. 200 with `id` and `runs`.
- **Report.** `POST /v1/runner.report` with `runId`, `ordinal`, `events`, `outcome`. 204.
- **Finish.** `POST /v1/runner.finish {"id": "<batch>"}`. 200 with the batch settled.
- **Read back.** `POST /v1/evals.runs.get {"id": "<run>"}` holds the trial with the reported status. `GET /api/evals/runs/<run>` with the session cookie answers the same run.
- **All of it at once.** `bun run e2e` drives every scenario, and `bun run perf server` drives every hot endpoint under load. Any failed request fails the perf run.

## Gotchas

- An organization may hold 3 batches open at once. Finish what you start or the next start answers 409.
- A batch holds at most 100 trials (cases times variants times trials).
- Request bodies are capped at 4 MiB, which bounds a single report's journal.
