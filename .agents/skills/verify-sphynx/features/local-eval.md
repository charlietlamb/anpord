# Local eval run

A user runs a suite file on their own machine with `sphynx eval <file> --local`. Every case runs on every variant in a local sandbox, the CLI prints each trial as it goes, and with a key the batch is recorded so the dashboard can show it.

## Sub-features

- `local-keyless` runs and gates a suite with no key and records nothing.
- `local-recorded` runs with a key, starts a batch, reports each trial, and finishes the batch.
- `local-exit` exits 0 when every check passes and 2 when one fails.

## How to get to it (user POV)

- `sphynx eval <file> --local` from a terminal.
- `sphynx eval <file> --local --ui` to open the batch in the dashboard as well.

## Driving it with the built CLI

Preconditions:

- `(cd packages/sdk && bun run build)` has run in this worktree.
- For `local-recorded`, a server you started and a key minted for its organization (the perf and e2e harnesses both do this).

- **Keyless run.** Run `env -u SPHYNX_API_KEY SPHYNX_BROWSER=none bun packages/sdk/dist/bin.cjs eval scripts/fixtures/local-smoke/smoke.eval.ts --local`. Exit code `0`, and the output names `writes-hello` on `command/probe` as passed.
- **Recorded run.** Run the same with `SPHYNX_API_KEY=<key> SPHYNX_BASE_URL=<server>`. Exit code `0`, the output prints a batch id, and `POST /v1/evals.batches.get {"id": "<batch>"}` answers with one run whose distribution has `passed: 1`.
- **Failing check.** Point it at a suite whose command validator fails. Exit code `2`, and the output names the case and variant.

## Gotchas

- The smoke suite needs no model credential. A suite with a real harness or a judge does, and a live run costs money.
- Without `SPHYNX_BROWSER=none`, `--ui` opens the browser that `SPHYNX_BROWSER` names, or the system default when it is unset.
