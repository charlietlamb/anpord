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

| Input | Default |
| --- | --- |
| `api-key` | Required, with `evals:read` and `evals:write` |
| `working-directory` | `.` |
| `file` | Discover `*.eval.ts` recursively |
| `fail-on` | `strict` |
| `timeout` | `1200` seconds per run |

`strict` requires every requested trial to pass. `regressed` gates on baseline regressions. `unscored` also rejects cells without scores. `never` ignores scores, but infrastructure failures still fail.

The job summary links to each run. The `report` output points to a JSON array of `{ file, runId, run, problems }`. Run IDs are written before polling. Upload the report with an `always()` artifact step to preserve failures.

Use `pull_request` for trusted branches. Fork and Dependabot PRs do not receive the Anpord secret. Do not run untrusted PR code with secrets through `pull_request_target`.

GitHub cancellation and timeout stop waiting, not the remote run. Set a workflow timeout and avoid automatic submission retries. No GitHub write permissions are required.
