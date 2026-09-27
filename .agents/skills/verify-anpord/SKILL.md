---
name: verify-anpord
description: Runs anpord's full verification bar in one command (install, typecheck, check, comments, knip, biome on changed files, tests on a scratch database, e2e, the built CLI on the keyless smoke suite) and then a side by side perf comparison against the PR's base branch. Also says how to launch and drive the server, the dashboard and the CLI by hand. Use before reporting any anpord change as ready, when a gate fails and you need its log, or when you need numbers for a perf claim.
---

# Verify anpord

One command runs every gate a change must pass and leaves its evidence on disk:

```bash
.agents/skills/verify-anpord/scripts/verify.sh
```

Run it from the root of the worktree you changed. It prints `PASS`, `FAIL` or `SKIP` per step. Steps that ran show their duration, and passing test, e2e and perf steps also show their counts. Each step that ran writes its full log to the evidence directory named at the end, beside `summary.txt`, and the script exits 1 if any step failed.

| Variable | Default | Effect |
| --- | --- | --- |
| `BASE_REF` | the open PR's base branch (`gh pr view`), else `origin/main` | What biome diffs against and what the perf step measures as "before". It is fetched first. |
| `PERF` | `full` | `quick` for smaller data and fewer samples, `skip` to leave perf out. |
| `SKIP` | empty | Space separated step names to skip, such as `SKIP="e2e perf"`. |
| `EVIDENCE_DIR` | `$TMPDIR/anpord-verify/<branch>-<time>` | Where logs go. |

A full run takes about an hour, most of it the perf step. `PERF=quick` brings that to about 15 minutes. Say which one you ran when you report.

## Launch

The gates start what they need and stop it. To poke at the app yourself:

- **Server.** `bun run perf server --quick` proves a real server boots against a seeded scratch database. For a server you keep, follow `apps/e2e/README.md`: `bun run e2e` leaves its Postgres cluster running with keys in `apps/e2e/.e2e/api-keys.json`, then start `apps/server` against it on a free port. Ready means `GET /api/healthz` answers 200.
- **Dashboard.** `bun run dev` serves the web app on 3005 and the server on 3003 against `.env.local`. Only use it when the operator's own stack is not already running there. The perf web suite builds and serves its own copy on a free port instead.
- **CLI.** `bun --cwd packages/sdk run build`, then `bun packages/sdk/dist/bin.cjs eval scripts/fixtures/local-smoke/smoke.eval.ts --local` runs a keyless suite in under a second.

## Doctor

Before driving anything, check it is yours and alive:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:<port>/api/healthz   # 200
lsof -nP -iTCP:<port> -sTCP:LISTEN                                               # a process you started
psql postgresql://localhost:5432/postgres -Atc "select datname from pg_database where datname like 'anpord_scratch_%'"
```

A scratch database left over from a crashed run is safe to drop. `anpord_dev` and `anpord_test` belong to the operator and are never touched.

## Drive

`features/README.md` maps each user facing feature to its recipe. The verify script drives three of them itself: the local eval run (sdk-smoke), the API and runner surfaces (e2e), and the perf comparison.

For UI changes the script is not enough: open the page in a Chrome you launch with a fresh profile (`launchChrome()` in `apps/perf/src/web/browser.ts` does this, and `signedInContext()` there sets the session cookie from the `cookie` that `givenTenant()` in `apps/perf/src/stack/tenant.ts` returns), take a screenshot before and after, and name both files in the report.

## Evidence

- Proof is the step log, not the summary line. Quote the counts (`N tests passed`, `51/51 scenarios passed`, `0 regressed beyond 5%` or `0 regressed over both passes`) and link the log path.
- The perf step prints a before and after table. Paste the rows that matter into the PR with the command that produced them.
- A step that was skipped is reported as skipped, never as passed.

## Cleanup

The script drops its scratch database on exit, and the perf harness drops its own. The e2e step passes `--stop`, so its Postgres cluster stops when it finishes. The base checkout the perf step makes lives at `$TMPDIR/anpord-verify-base-<sha>` and is reused for that commit once `$TMPDIR/anpord-verify-base-<sha>.ready` marks its install as finished; remove it with `git worktree remove <path>` once the base moves on. Evidence directories are never deleted by the script.

## Helpers

- `scripts/verify.sh` runs the whole bar as above.
- `bun run perf <suite>`, `bun run perf compare`, `bun run perf ab` are documented in `apps/perf/README.md`.
