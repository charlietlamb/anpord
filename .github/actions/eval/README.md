# Anpord evals

Run the project's installed `anpord` CLI. The action does not install dependencies or choose models.

After checkout and your normal locked dependency install:

```yaml
- uses: charlietlamb/anpord/.github/actions/eval@COMMIT_SHA
  with:
    api-key: ${{ secrets.ANPORD_API_KEY }}
    working-directory: evals
```

Replace `COMMIT_SHA` with the action release commit. Keep `anpord` installed in your project.

Connect the harness as an organization default in Anpord. The API key uses that organization's connections, not your personal login. Provider credentials do not belong in the workflow.

| Input | Default |
| --- | --- |
| `api-key` | Required, with `evals:read` and `evals:write` |
| `working-directory` | `.` |
| `file` | Discover `*.eval.ts` recursively |
| `case` | Every case |
| `variant` | Every variant |
| `fail-on` | `failures` |
| `timeout` | `1200` seconds per batch |
| `github-token` | None, so no check run is posted |

Each suite file runs as one batch: every case on every variant. `case` picks one case from the file. Without a `file`, `case` runs a case Anpord already stores, on its newest version. `variant` narrows the variants, separated by commas or new lines: `harness/model` for a file, or variant IDs for a stored case.

`failures` fails on any run whose trials did not all pass. `strict` also requires every requested run and trial to have finished. `never` ignores scores, but infrastructure failures still fail.

The step exits 0 when the gate passes, 2 when it fails, and 1 when a batch could not start or finish.

| Output | Value |
| --- | --- |
| `report` | Path to a JSON array of `{ suite, file, batchId, batch, error, problems }` |
| `batch-ids` | The batch IDs started, separated by commas |
| `conclusion` | `success`, `failure`, or `neutral` |

The job summary links to each batch. Batch IDs are written before polling. Upload the report with an `always()` artifact step to preserve failures.

To post the results as an `anpord` check run on the commit, pass a token and grant the job `checks: write`:

```yaml
permissions:
  contents: read
  checks: write
steps:
  - uses: charlietlamb/anpord/.github/actions/eval@COMMIT_SHA
    with:
      api-key: ${{ secrets.ANPORD_API_KEY }}
      github-token: ${{ github.token }}
```

Use `pull_request` for trusted branches. Fork and Dependabot PRs do not receive the Anpord secret. Do not run untrusted PR code with secrets through `pull_request_target`.

GitHub cancellation and timeout stop waiting, not the remote batch. Set a workflow timeout and avoid automatic submission retries. Without `github-token`, no GitHub write permissions are required.
