# Model judges

## Research

Braintrust separates the task from named scorers. Its LLM classifier accepts a prompt template, a model, and labels mapped to numeric scores. Evidence includes input, output, optional expected output, and metadata. Scorers can run inline, from published definitions, or in its UI. See [LLM-as-a-judge](https://www.braintrust.dev/docs/evaluate/llm-as-a-judge).

Its [scorer guidance](https://www.braintrust.dev/docs/best-practices/scorers) recommends explicit, narrow criteria and calibration against human-labeled examples. Deterministic checks remain useful alongside model judgments. Thresholds turn scores into pass conditions without discarding the underlying score.

## Anpord decisions

- `judge({ ... })` is a serializable validator, not a model client or callback. Consumers do not need Effect.
- `validate` composes code checks and judges. Existing single-function validators still work.
- The model chooses a label. Anpord maps it to a declared score and compares it with an inclusive threshold.
- Rubric, reference answer, model, scores, and thresholds participate in case identity. Stored runs retain their original definitions.
- Failures are unscored, not zero or a pass. A trial with any judge error is void.
- OpenAI uses the [Responses API's structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), without tools or response storage.
- Agent judges use the existing harness and sandbox interfaces. Codex uses its [supported subscription authentication](https://learn.chatgpt.com/docs/auth), not an OAuth token passed to the Platform API.
- Agent judging starts after task cleanup, preventing nested sandbox semaphore waits. Judge workspaces receive no task files or mocks. Tool calls invalidate the result but are not an egress control.
- Evidence is intentionally limited to prompt, final answer, and expected answer. Tool logs remain the responsibility of deterministic validators.
- Brief evidence-based explanations are recorded, not private reasoning traces. Credentials and raw provider errors are excluded.

This first release does not implement Braintrust's scorer registry, UI authoring, span selectors, optional skipped scores, or aggregate score charts. Judge usage is explicitly unpriced. Those are separate capabilities, not requirements for honest per-trial scoring.

## Verification

Offline tests cover authoring, compilation, choice mapping, invalid output, verdict composition, and cleanup ordering. The opt-in `packages/eval/tests/integration/agent-judge.test.ts` runs positive and negative controls against Codex in E2B using an exact model. Run it with `EVAL_LIVE_JUDGES=1` and configured E2B and Codex credentials. It does not call third-party fixture APIs.
