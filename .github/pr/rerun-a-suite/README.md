# Evidence for "A suite runs again from one plan you can see before it starts"

Everything below was measured against a seeded local stack, signed in as an owner, on `local/smoke`: 32 cases, 3 variants each.

## The plan endpoint, every combination

`POST /api/evals/suites/local-smoke/runs/plan`

| Intent | Slots | Fresh variants | Trials in all | Skipped |
|---|---|---|---|---|
| every case, as before, 1 trial | 91 | 0 | 91 | none |
| every case, as before, 2 trials | 50 | 0 | 100 | 15 `overBatchLimit` |
| only failures, as before, 1 trial | 12 | 0 | 12 | 22 `nothingFailed` |
| every case, on claude/opus, 1 trial | 32 | 32 | 32 | none |
| only failures, on claude/opus, 1 trial | 10 | 10 | 10 | 22 `nothingFailed` |

Two of these carry the design.

At 2 trials the cap of 100 trials per batch bites. The planner fills whole cases newest first until the cap and reports the remaining 15 as over what one batch can hold, rather than refusing the whole re-run.

On a picked model the 32 cases give 32 slots, not 96. Three variants of one case collapse to a single target, which is the deduplication the `(batchInternalId, variantInternalId)` unique index requires.

## A stale plan is refused, and starts nothing

```
POST /api/evals/suites/local-smoke/runs
{"scope":"everyCase","target":{"kind":"asBefore"},"trials":1,"expect":"deadbeefdeadbeef"}

409 {"message":"This suite changed while you were choosing. Check the preview again.","_tag":"Conflict"}
```

## The model catalogue on the internal API

```
GET /api/evals/models?harness=claude
{"harness":"claude","total":3,"models":[haiku, opus, sonnet]}
```

## The dialog in a browser

Driven with a real Chrome against the same stack. The footer reported the same numbers the API did.

| Action | Footer |
|---|---|
| open on `local/smoke` | 91 runs across 32 cases, 91 trials in all |
| switch to only the ones that failed | 12 runs across 10 cases, 12 trials in all |
| raise to 3 trials | 12 runs across 10 cases, 36 trials in all |

Choosing a harness reveals the model field and the preview holds at "Choose a model to see what would run", so no request fires that the server would refuse.

## Screenshots

| File | What it shows |
|---|---|
| `01-suite-screen.png` | The suite screen with Run again in the header |
| `02-every-case.png` | Every case, 91 runs across 32 cases |
| `03-only-failed.png` | Only the ones that failed, 12 runs, and 22 cases left out with the reason |
| `05-dashboard.png` | The main dashboard with Run again beside New eval |
| `06-dashboard-dialog.png` | The dashboard dialog asking which suite |
| `08-harness-picked.png` | A harness picked, waiting on a model |
| `rerun-preview.png` | The preview in the dev catalogue, with all four skip reasons |

## Gates

```
typecheck        19 successful, 19 total
check            1704 files, no fixes applied
check:comments   clean across 1253 files
knip             no findings
doctor           90 / 100, no warning in a file this branch touches
test             32 successful, 32 total, including 130 web tests and 16 planner tests
```
