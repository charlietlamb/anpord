# Custom harness runner plan

Anpord can already run any agent through the `command` harness, but every team has to hand write the JSON line protocol and the mapping from its framework's events. This program adds a typed runner kit (`anpord/runner`), an eve adapter (`anpord/runner/eve`), and workspace files as judge evidence (`judge({ files })`). It then dogfoods all three with a content quality suite for Notra's content-writer in `anpord-spikes`.

PRs in order: PR0 spike (no merge, spikes only), PR1 runner kit, PR2 eve adapter, PR3 judge files, PR4 Notra writer suite (spikes repo).

## Decisions already made

- Layers, not a server harness. The `command` JSON line protocol stays the generic contract. `anpord/runner` is the generic TypeScript helper over it. Framework adapters are thin subpaths over the kit, eve first. No `harness: "eve"` on the server, because Anpord harnesses are agents Anpord installs, and an eve agent is the user's own code.
- Packaging follows the existing SDK subpaths (`anpord/validators`, `anpord/mcp`): new `exports` entries in `packages/sdk/package.json` and entries in `packages/sdk/tsdown.config.ts`. `eve` is an optional peer dependency used only by `anpord/runner/eve`.
- How eve runs in the sandbox is settled by the PR0 spike, not by guessing.
- `files` is a judge option only. Code validators already have `readText`.
- Pairwise and gold reference judges are out of scope.

## Ground truth

- Protocol decode: `packages/eval/src/domain/command-line.ts` (`CommandLine` schema) and `packages/eval/src/adapters/harness/command-events.ts` (`decodeCommandLine`).
- Command harness docs: `apps/docs/evals/command-harness.mdx`, profiles in `apps/docs/evals/profiles.mdx`.
- Judges run after the sandbox closes: `packages/eval/src/services/judged-trial.ts` wraps `AgentTrial` and calls `evaluateJudge` with `readAnswer(result.events)`. Evidence clipping lives in `packages/eval/src/judges/conversation.ts` (4,000 per entry, 48,000 total). The judge schema is `packages/schema/src/domain/eval-judges.ts`. The SDK `judge()` is in `packages/sdk/src/validators.ts`.
- In-sandbox scoring happens in `packages/eval/src/services/agent-trial.ts`. Local runs go through `packages/eval/src/local-layer.ts`.
- eve client stream (eve 0.58 in `anpord-spikes/testing/notra`): `session.started`, `message.appended`, `message.completed` (`finishReason`), `actions.requested`, `action.result`, `step.started` and `step.completed`, `result.completed` (structured output), `input.requested`, `session.waiting`, `session.completed`, `session.failed`. Read the installed `eve/docs/guides/client/streaming.mdx` after `bun install`, since `node_modules` was stale at 0.27.
- Notra content-writer: `apps/agent/agent/subagents/content-writer/{agent.ts,instructions.md,tools/}`, tool logic in `packages/tools/src/content-writer/`, result schema `packages/ai/src/schemas/content-writer-result.ts`, task message shape in `apps/dashboard/src/lib/agent/content-task.ts`.
- Gates: `.agents/skills/verify-anpord/scripts/verify.sh`. Keyless CLI smoke is `(cd packages/sdk && bun run build)` then `bun packages/sdk/dist/bin.cjs eval scripts/fixtures/local-smoke/smoke.eval.ts --local`.

## PR0. Spike how eve runs inside a trial

Goal: pick the adapter's entry shape from evidence.

- [x] `cd ~/Documents/anpord-spikes/testing/notra && npx bun@1.4.0 install --frozen-lockfile`. Evidence: `apps/agent` resolves eve 0.58.1.
- [x] Build a throwaway eve agent whose root is the content-writer, with the real instructions, fixture tools, and a `create_post` that writes `out/post.md`. Evidence: `eve info` reports 9 tools, 0 diagnostics.
- [x] Option A, `eve dev --no-ui` on a free port, then an `eve/client` session. Evidence: Appendix A.
- [x] Option B, an in-process entry. Evidence: none exists in 0.58. `eve invoke` and `eve acp` were measured instead, Appendix A.
- [x] Write the verdict and numbers into Appendix A. Verdict: `eve dev` plus `eve/client`.

## PR1. Runner kit at `anpord/runner`

Data shape first. The emitter writes exactly the `CommandLine` union the server decodes. Import that schema into the SDK rather than redefining it, so the two sides cannot drift.

- [ ] `runner.env()` returns typed `prompt`, `model`, `workspace`, `home`, `systemPromptFile`, `traceLog`. Missing `ANPORD_PROMPT` fails loudly.
- [ ] `createEmitter(write?)` with `started`, `message`, `toolCall`, `usage`, `command`, `fileChange`, `finished`. Default sink is stdout. `finished` is idempotent.
- [ ] Subpath wired in `package.json` exports and `tsdown.config.ts`. Evidence: `node -e "require('anpord/runner')"` against the built package.
- [ ] Tests in `packages/sdk/tests/runner/`. Each emitter method's line goes through `decodeCommandLine` and equals a literal expected event. A test fails if the emitter returns nothing.
- [ ] Docs. A runner kit section in `apps/docs/evals/command-harness.mdx` that replaces the hand written JSON example as the primary path.
- [ ] Live. A `command` variant whose profile `run` is a five line script using the kit runs with `--local` and the trial shows Started, a ToolCall, a Message as the answer, Usage, and Finished.

## PR2. eve adapter at `anpord/runner/eve`

- [ ] `runEve({ url, prompt, headers? })` streams one session through `eve/client` (`client.sessions.create({ message })`), and `serveEve({ cwd, port? })` boots `eve dev --no-ui --logs none` and waits on `client.health()`. PR0 picked this shape. Maps the eve stream onto the kit:
  - `session.started` to `started`, with the session id from the `session.waiting` continuation token or the session handle
  - `actions.requested` plus `action.result`, paired by `callId`, to one `toolCall` with input, output, status, error
  - final `message.completed` (not `tool-calls`) to `message`. With an output schema this text is the JSON result
  - `step.completed` usage to `usage`
  - `session.completed` and `session.waiting` to `finished` done, `session.failed` to `finished` with the error
  - `input.requested` to `finished` with a reason that says the agent parked, so it never looks like a pass
- [ ] Mapping is a pure function from an eve event array to emitter calls. A table keyed by event type, not a chain of conditionals.
- [ ] `eve` is an optional peer. Importing `anpord` or `anpord/runner` without eve installed still works. Evidence: a test that resolves both without eve.
- [ ] Tests from a recorded NDJSON fixture captured in PR0 (real eve output, not hand written) to literal expected command lines. Include a failed session and a parked session.
- [ ] Docs. A guide `apps/docs/guides/eve.mdx` with the profile layout and a minimal suite, linked from `docs.json`.
- [ ] Live. The PR0 agent runs under a `command` variant with `--local` and the trial journal shows the eve tool calls in order.

## PR3. Judges read workspace files

- [ ] Schema. `files` on `EvalJudge`, workspace relative paths, at most 8, no `..`, no absolute paths. Changing it changes the case version, like any judge field.
- [ ] Capture. `agent-trial.ts` reads the paths while the sandbox is still open, after code validators run, and returns them on the trial result. Caps of 32,000 characters per file and 96,000 total. Secrets redacted with the same helper as the answer.
- [ ] Judge evidence. `judged-trial.ts` passes the files. `judges/prompt.ts` adds a `files` evidence block. Files are not clipped by the 4,000 per entry conversation limit.
- [ ] Failure semantics. A missing or oversized file voids the judgment with a message that names the path. It never scores.
- [ ] Local parity. `--local` runs capture the same files.
- [ ] SDK `judge()` accepts and validates `files`. Docs in `apps/docs/evals/judges.mdx`.
- [ ] Tests. A judge sees the full text of a 20,000 character file. A missing file voids the trial. A secret in a file is redacted in the judge request. Run the DB backed tests on a scratch database per verify-anpord.

## PR4. Notra writer quality suite (anpord-spikes)

- [ ] Profile `notra-writer` that runs the re-rooted writer through `anpord/runner/eve`. Source tools, skills, and brand references read fixtures from the workspace. `create_post` writes `out/post.md` and returns a fake id. Tool input schemas imported from `@notra/tools` so drift breaks typecheck.
- [ ] Suite `notra-writer-changelog` on the current API (`suite`, `variants`, `repo`, `files`). Five cases. Clean release, only chores (expects skipped), repo name differs from brand (expects created), noisy window, metric present versus absent.
- [ ] Code checks. No em or en dashes, title at most 120 characters, exactly one post, `unslop` loaded before `create_post`, no PR outside the lookback window named in the post.
- [ ] Judges with `files: ["out/post.md"]`. Grounding, brand voice against the fixture references, slop.
- [ ] Variants. `openai/gpt-6-sol` and `anthropic/claude-sonnet-5.5`, same profile, 3 trials.
- [ ] Live. One full batch runs, every trial is scored or void with a reason, and the dashboard shows both variants side by side.

## Verification rule for every PR

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and gate boxes are all checked.

- Unit. The PR's tests pass and each asserts a literal expected value.
- Live. The scenario named in the PR's Live box ran against the built CLI and its trial output is saved.
- Gates. `.agents/skills/verify-anpord/scripts/verify.sh` passes at the PR head, including typecheck, check, comments, knip, biome, tests, e2e, and the keyless smoke.

## Appendix A. Spike results

Measured on 2026-10-02 with eve 0.58.1, the content-writer re-rooted as an eve agent with fixture tools, and `chatgpt("gpt-5.6-luna")` through the local Codex login. Model latency dominates the totals and varies run to run.

| Option | Ready | First event | Total | Peak RSS | Tool calls | Token usage | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `eve dev --no-ui` plus `eve/client` (run 1) | 4.2 s | 4.4 s | 47.9 s | 187 MB | yes, 7 with call ids, input, output | yes, per `step.completed` | chosen |
| `eve dev --no-ui` plus `eve/client` (run 2) | 13.3 s | 14.5 s | 89.5 s | 175 MB | yes, 7 | yes | chosen |
| `eve invoke "<prompt>"` | n/a | n/a | 32.4 s | 1.69 GB (`time -l`) | no, final outcome only | no | rejected |
| `eve acp` over stdio | 5.6 s | 14.8 s | 129.4 s | not comparable (detached group) | yes, `tool_call` and `tool_call_update` | no | rejected for eve, kept as a future generic ACP adapter |

- No in-process entry exists. eve 0.58 exports no server factory. `eve invoke`, `eve acp`, and `eve dev` all boot the same local dev server.
- Peak RSS is the process group sampled every 500 ms. `eve invoke` was measured with `/usr/bin/time -l`, which counts differently, so treat it as an upper bound.
- e2b was not measured. No AI Gateway or provider key exists locally, and `chatgpt()` credentials are local only. PR4 needs an AI Gateway key in an Anpord env connection to run in a hosted sandbox.
- Structured output arrives as the final `message.completed` with `finishReason: "stop"` and the JSON text. There is no separate `result.completed` event in this run.
- The recorded stream at `events-run1.ndjson` is the PR2 test fixture.
- The first `eve invoke` post left an empty `## Improved` heading. That is a content quality defect PR4's checks should catch.

## Appendix B. Cleanup already done (2026-10-02)

- Deleted `anpord-spikes/testing/notra/packages/ai/evals/anpord/` (old `defineEval`, `tasks`, `provider` API).
- Deleted `anpord-spikes/testing/transcript/` (old `tasks` API).
- Dropped the notra stash `9c2d9deb` that only wired those evals. Recoverable with `git stash apply 9c2d9deb` until garbage collection.
- `anpord-spikes/apps/playground` already uses the current API and stays.
