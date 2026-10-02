# Sphynx verification map

The maintained source for proving sphynx's user facing behavior. Read this index, then use the matching feature file as the recipe.

## Baseline preconditions

- Work from the root of your own worktree, after `bun install`.
- Every database is a scratch one named `sphynx_scratch_<something>` on the local Postgres, or the e2e harness's own cluster. Never `sphynx_dev`, `sphynx_test`, or anything remote.
- Every server, web app and Chrome you drive is one you started on a free port. Never the operator's `bun run dev` on 3003 and 3005 unless they asked.
- No live model runs. The command harness and the fake judge cost nothing.

## Driving conventions

- The API is driven with `fetch` or `curl` against `/v1/<endpoint>` with `authorization: Bearer <key>`, or `/api/...` with the session cookie.
- The dashboard is driven with puppeteer on a Chrome launched with a fresh `--user-data-dir`.
- The CLI is driven as a subprocess with `SPHYNX_BROWSER=none`.

## Proof and skip reporting

- Capture the action and the resulting state: the response body or row, the page after the click, the CLI's exit code and output.
- A skipped entry point is reported as skipped with the reason.

## Features

- [Local eval run](./local-eval.md) covers the CLI running a suite on this machine and recording it.
- [Runner and read API](./runner-api.md) covers starting, reporting and reading batches, runs, cases and journals.
- [Dashboard eval pages](./dashboard.md) covers the evals list, a batch, a case and a trial with a long journal.
- [Performance](./performance.md) covers measuring and comparing the server, runner and web numbers.
