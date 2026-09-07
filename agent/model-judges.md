# Model judges

## Research

Braintrust separates the task from named scorers. Its LLM classifier accepts a prompt template, a model, and labels mapped to numeric scores. Evidence includes input, output, optional expected output, and metadata. Scorers can run inline, from published definitions, or in its UI. See [LLM-as-a-judge](https://www.braintrust.dev/docs/evaluate/llm-as-a-judge).

Its [scorer guidance](https://www.braintrust.dev/docs/best-practices/scorers) recommends explicit, narrow criteria and calibration against human-labeled examples. Deterministic checks remain useful alongside model judgments. Thresholds turn scores into pass conditions without discarding the underlying score.

## Anpord decisions

- `judge({ ... })` is a serializable validator, not a model client or callback. Consumers do not need Effect.
- `validate` composes code checks and judges. Existing single-function validators still work.
- The model chooses a label. Anpord maps it to a declared score and compares it with an inclusive threshold.
- Judge prompt, reference answer, model, scores, and thresholds participate in case identity. Stored runs retain their original definitions.
- Failures are unscored, not zero or a pass. A trial with any judge error is void.
- OpenAI uses the [Responses API's structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), without tools or response storage.
- Agent judges use the existing harness and sandbox interfaces. Codex uses its [supported subscription authentication](https://learn.chatgpt.com/docs/auth), not an OAuth token passed to the Platform API.
- Agent judging starts after task cleanup, preventing nested sandbox semaphore waits. Judge workspaces receive no task files or mocks. Tool calls invalidate the result but are not an egress control.
- Evidence is intentionally limited to prompt, final answer, and expected answer. Tool logs remain the responsibility of deterministic validators.
- Brief evidence-based explanations are recorded, not private reasoning traces. Credentials and raw provider errors are excluded.

This first release does not implement Braintrust's scorer registry, UI authoring, span selectors, optional skipped scores, or aggregate score charts. Judge usage is explicitly unpriced. Those are separate capabilities, not requirements for honest per-trial scoring.

## Verification

Offline tests cover authoring, compilation, choice mapping, invalid output, verdict composition, and cleanup ordering. The opt-in `packages/eval/tests/integration/agent-judge.test.ts` runs positive and negative controls against Codex in E2B using an exact model. Run it with `EVAL_LIVE_JUDGES=1` and configured E2B and Codex credentials. It does not call third-party fixture APIs.

### Release verification: 2026-09-06

- Published `anpord@0.1.12` from `045e9a6`; installed it in the separate customer spike and passed its mock MCP and CLI tests and scoped strict typecheck.
- Real Codex `gpt-5.6-sol` judges in E2B scored the positive arithmetic control 1 and the negative control 0.
- Workspace checks and CI passed. The existing API/SDK/CLI integration suite passed 46/46 scenarios. A fresh Postgres database accepted the complete migration journal; database-backed tests passed.
- Production has the validator and judgment columns. Trigger worker `20260906.6` executed both mock suites with Codex `0.153.4` and model `gpt-5.6-sol`.
- The missing Trigger dispatch key was added through Secrets Manager and attached to App Runner by ARN. Existing environment values were preserved. The server deployed `4821772`, and authenticated eval reads recovered from HTTP 500.
- Both fresh production trials passed and stored a `correct-server` judgment with score 1 and no error in Charlie Lamb's Org (`d52e8f01-3925-4a77-92a8-eb3f542f4865`): MCP `run_MN31TS7NVF0HYRMN5X3MYZTK`, CLI `run_MJBZT91TSE07TEE6DEYC8CTG`. Both use local static mocks, not external customer APIs. The published SDK read back completed runs, judge scores, and the expected tool/command trajectories.

The deployment workflow requires the Trigger key before building and checks the health response's revision against the deployed commit. Verification requires passing trials with stored judgments, not a green deployment job.

### Runtime fixes: 2026-09-06

- Daytona cleanup accepts the SDK's typed not-found error. E2B cleanup uses its idempotent static kill operation without reconnecting to a stopped sandbox. Other failures remain failures.
- The local cleanup sweep cleared 113 stale sandbox references with zero failures. Eval history was retained.
- Worker scripts use the installed CLI instead of resolving the latest release through `bunx`. The local worker starts with the pinned 4.5.15 version.
- The web server uses TanStack's default server entry. `bun --cwd apps/web run test:reload` checks HTML and other Accept headers across three full SSR reloads without modifying environment variables.
- The dispatcher no longer publishes an initial live run into its own memory. Only the executing worker owns live state. This prevents API reads from shadowing stored worker progress and completed judgments with a stale "running" snapshot. A database-backed regression checks detail reads, list reads, and organization isolation.
- Missing optional local Codex authentication is a debug message. Production uses organization credentials and does not need a local auth file.
- Codex MCP tool calls are decoded from `mcp_tool_call` items, including failure status and start/completion timing. These calls appear in the trajectory and are visible to the judge's tool-use check.
