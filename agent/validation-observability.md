# Validation observability

Audit: 6 September 2026, main `b29242c8865b6985e3b8a0772de60b0635c83063`.

This is an implementation plan, not a description of a shipped tracing feature. The additional test coverage is preserved in [validation-observability-tests.patch](validation-observability-tests.patch), targeting the audited revision. No runtime changes were deployed.

## Findings

| Priority | Finding | Owner |
| --- | --- | --- |
| P0 | A passing result marker is accepted even when the validator process exits 1 or never reports an exit. | `packages/eval/src/adapters/scorers/ground-truth.ts`, `scoreValidator` |
| P1 | Multiple code validators become one compiled check. Individual returns, names, timings, and skipped checks are lost. | `packages/sdk/src/evals/compile-validator.ts`, `runner-source.ts` |
| P1 | Validator messages and stdout/stderr reach the scorer but are absent from `TrialOutcome` and persistence. | `ground-truth.ts`, `packages/eval/src/domain/trial.ts` |
| P1 | Judges return text through `JudgeModel`, then discard it after parsing. Invalid responses cannot be inspected. | `packages/eval/src/judges/model.ts`, `evaluate.ts` |
| P1 | Provider requests, request IDs, reported model, and usage are not retained. Agent judges also discard their session metadata. | `packages/eval/src/judges/openai.ts`, `agent.ts` |
| P2 | The dashboard Calls section describes candidate-agent commands and tools, not validator context calls. | `apps/web/src/components/evals/trial-calls.tsx` |
| P2 | Runtime `readOrEmpty` maps every read error to an empty string, hiding the difference between absent evidence and a read failure. | `packages/sdk/src/evals/runner-source.ts` |

The P0 reproduction supplied a valid `passed: true` marker with process exit 0, exit 1, and no exit event. All three returned `status: passed`, `exitCode: 0`. None retained the diagnostic log or returned message. This is a reproduced defect, not evidence that any particular production trial crashed.

The screenshot's older CI run used `61a3f3d`, before source capture reached main. New runs now include source. Historical runs cannot recover source or execution details that were never stored; do not reconstruct them from today's checkout.

## Verified

- 54 focused offline tests pass. Coverage includes compiled validators, exact method results, stdout/stderr, exceptions, exact TypeScript, mock CLI/MCP evidence, judge request contents, choice mapping, invalid output, timeouts, and verdict composition.
- Scoped SDK/eval typechecks and formatting checks pass.
- [Production CI 34042873968](https://github.com/charlietlamb/anpord/actions/runs/34042873968) passed all nine trials under Anpord CI (`4hlLjOnlVfxKtRKJRlfL8PtHJVadmSaP`).
- API reports contain five source files for CLI, five for MCP, and three for SDK. All 13 copies match local source text exactly. Every report retains the CI trigger link.
- CLI: `run_8VC5VECJB5MDHMZGEACRGWAK`; MCP: `run_B9AQ6TK075XEYJC45DRKD1KP`; SDK: `run_6DAYMD55VP77E842EMN20NSB`.
- These CI suites contain code validators, not LLM judges. Their empty `judgments` arrays are expected.
- The existing live Codex judge integration test passed both controls in isolated E2B sandboxes: prompt `What is 2 + 2?`, answer `4` scored 1; answer `5` scored 0. Both used `gpt-5.6-sol`, with no judge error. This was a locally launched integration test, not a dashboard run.
- No Manufact APIs were called. Existing credential configuration was used; no environment files or deployed configuration were changed.

## Model

Keep the hierarchy: **run → case/variant → trial → validation execution → observed calls and logs**.

Source is immutable configuration attached to the case/variant. An execution belongs to one trial. Several trials may share the same source but must never share execution evidence.

Use one schema-defined execution envelope with a discriminated detail union for `code`, `judge`, and `command`. Keep these separate from candidate harness events.

Common fields:

- Execution ID, original validator index, display name, kind, start time, duration.
- Status: running, passed, failed, error, or skipped. An error is not a score of zero.
- Source snapshot reference where available. Preserve original files; never display a function's `toString()` as its TypeScript source.
- Error category and safe message, actual process exit where applicable, capture completeness.
- Observed calls and logs in execution order, with sequence numbers and timestamps.

The compiler should retain a manifest of validators before minification. Use the original array index as identity, not the function name. Named functions improve labels; anonymous functions can use `Validator 2`. Do not introduce AST inference or require a wrapper solely for naming.

Keep today's execution policy initially: code checks run sequentially and stop at the first failure; judges run after task cleanup unless the trial is void. Preserve original indices and record execution order explicitly because mixed arrays currently group code before judges. Record unexecuted validators as skipped with a reason. Do not silently change ordering while adding tracing.

## What to capture

### Code validators

The argument is a context containing methods, not a serializable input object. Record the concrete data the validator actually observes:

| Method | Input | Output |
| --- | --- | --- |
| `answer`, `transcript` | No arguments | Exact returned text |
| `readText`, `exists` | Path | Text or boolean, or error |
| `exec` | Command | stdout, stderr, exit code |
| `mcp.calls`, `cli.calls` | Optional server/CLI filter | Exact returned call records |

Also record prepared data when full capture is enabled, the raw validator return, the normalized verdict, and stdout/stderr. Keep a thrown exception distinct from `return false`.

Wrap the SDK's known context methods once in the generated runtime. Do not monkey-patch filesystem/network libraries, walk arbitrary object graphs, or claim to trace arbitrary helper-function arguments. Authors can log additional intermediate values explicitly.

Use a dedicated schema-validated result artifact, separate from ordinary stdout/stderr. Flush per-validator records as checks complete so a later exception does not erase earlier checks. Read available artifacts and logs before sandbox cleanup on both success and failure. Missing or malformed required results, missing process termination, and nonzero process exit must never pass. A normal `false` return remains a completed validation, not a process crash.

Initial scope is post-execution inspection, not live line-by-line streaming. Persist execution start and terminal states. If a sandbox disappears before its detail artifact is collected, show an interrupted execution and incomplete capture, not fabricated empty inputs or logs. Durable streaming across sandbox loss is a separate transport change.

### LLM judges

Capture the actual submitted request at the adapter boundary:

- Instructions containing the rubric, serialized evidence, expected answer, choice schema, requested model, and generation options.
- Raw final response text before JSON parsing, including invalid JSON.
- Parsed choice and reason, mapped score, threshold, and final status.
- Provider request/response ID, reported model and usage when supplied. For agent judges, harness version and session metadata.

Do not reconstruct requests later from configuration. OpenAI and agent judges submit different request shapes. Describe these with separate schema variants inside the common execution envelope.

Change `JudgeModel.complete` from bare text to a typed completion containing text and available metadata. Preserve partial evidence on typed failures. Keep `evaluateJudge` responsible for parsing, choice mapping, thresholds, and timing.

The current judge evidence is **prompt + final answer + expected answer**. It does not include the candidate's MCP/CLI journal. Keep deterministic validators responsible for those checks unless the author explicitly supplies additional judge evidence in a future API.

Never record credentials, authorization headers, hidden reasoning, or an entire opaque provider response. Capture final output and brief judgment reasons only. Agent judges currently reject tool use after execution; this is not network isolation.

## Storage, API, and logs

Extend existing ownership rather than building a generic tracing framework:

- SDK compiler/runtime: manifest and observed calls.
- Scorer: process completion, code execution evidence, normalized verdict.
- JudgeModel adapters: actual requests and final responses.
- Judge evaluator: score and error semantics.
- TrialRecorder: persistence and trial association.
- Shared schemas: wire contracts consumed by server, SDK, and web.

Store compact validation summaries with the trial. Put bounded execution details in a separate trial-owned validation table, accessed only on detail reads. Required results and trial settlement must be written consistently. Follow existing trial restart ownership and clear superseded evidence together with its journal; never mix two attempts' records.

Proposed public API, following the existing RPC convention:

```ts
const run = await client.evals.get({ id: runId });
const execution = await client.evals.validation({
  id: runId,
  cellKey,
  ordinal: 1,
  executionId,
});
```

`evals.get` exposes lightweight `trial.validations` summaries. The detail endpoint returns the typed input, output, calls, logs, and capture status. Generate SDK types and API docs from the shared schema. Reuse the same read service for dashboard and public API; enforce organization ownership through the entire run/cell/trial lookup. Never trust a caller-supplied organization ID.

Keep CI summary artifacts compact and link to execution details. A separate explicit download can include full traces; do not automatically publish private inputs into GitHub summaries or broadly accessible artifacts.

Operational telemetry should emit start, completion, and error records with run, cell, trial, execution, validator, and trace IDs. Include status, duration, error category, and available provider request ID. Keep full evidence in the authenticated product API, not general application logs.

Reuse `telemetryFor` and existing Effect spans. It is configured via `AXIOM_URL`, `AXIOM_TOKEN`, and `AXIOM_DATASET`; it does not currently emit per-validator result payloads. An exporter being configured is not proof of delivery. Acceptance must include querying a known execution ID in the configured log backend.

## Capture policy

One capture policy at eval level is sufficient. Proposed `captureValidation: "summary" | "full"`: summary by default for SDK consumers; explicitly enable full capture in our CI fixtures. No Effect types or observability wrappers in consumer validators.

Required verdicts are always recorded. Full capture adds observed payloads and logs. Start with bounded text/JSON fields, for example 64 KiB per field and 1 MiB per trial, enforced by shared constants before persistence. These are proposed limits, not existing limits.

Represent completeness explicitly: complete, truncated, redacted, disabled, or unavailable, with original size where known. Never label truncated or redacted content as exact. Do not silently truncate required result structures. Serialization failures in optional evidence must not invent a validation result.

Do not serialize process environment or credentials. Provide an explicit payload-redaction hook before full capture leaves the sandbox; test it with secret canaries. Captured source has its existing independent policy. Document that authored logs and prepared values can contain sensitive data. Apply trial retention and deletion to validation details as well.

## Dashboard

- Case/variant page: prompt and original source configuration. Do not imply that a function executed there.
- Trial page: one flat list of validations showing name, kind, status/score, and duration.
- Opening an entry reveals **Input · Output · Calls · Logs · Source** without nested cards.
- Show the returned value separately from the normalized verdict. For judges, show choice, score, threshold, and reason together, with exact request/response available below.
- Display context calls under their validator, distinct from the candidate agent's Calls section.
- Make skipped, interrupted, truncated, capture-disabled, and historical-unavailable states explicit.
- Give failures a useful first view: error and relevant output, not a large source file by default.

## Delivery order and acceptance

1. Fix the exit-code defect with regression tests for nonzero exit, missing exit, malformed result, and normal false returns. Normalize strict validator results directly; do not infer execution validity from message text or generic verifier-output patterns.
2. Add shared execution schemas and compiler manifests. Preserve single-function syntax, arrays, judges, and original source capture.
3. Capture code context calls, raw returns, exceptions, and logs. Preserve partial results after later failures.
4. Enrich judge completions and retain exact submitted evidence and raw final output before parsing.
5. Add trial-owned persistence, authenticated detail API, SDK types, and correlated operational logs.
6. Build the flat trial validation UI and update concise docs with one mixed code/judge example.
7. Add judged CI coverage and run fresh production verification after deployment. Release an SDK patch only when the contract is complete.

Required tests beyond this audit:

- Multiple code checks: all pass; first fails; later throws; skipped entries remain visible.
- Every context method: exact arguments/results, concurrent calls correctly associated, method rejection.
- Mixed code/judge: original identity retained, cleanup ordering preserved, code failure cannot be overridden by a passing judge.
- Judges: positive/negative controls, malformed output, refusal, timeout, provider failure, usage/request ID preservation, tool-use rejection for agent judges.
- Persistence: normal finish, cancellation, partial evidence, retry without duplication, read after worker restart, retention/deletion.
- API: summary/detail consistency, strict decoding, unauthorized and cross-organization reads rejected, no payloads in list responses.
- Privacy: credential canaries absent, redaction before upload, explicit size limits and truncation indicators.
- UI: exact text/copy behavior, no nested cards, useful failure view, historical absence distinguished from no validators.
- Production: code + judge in the same trial, positive and negative controls, source and evidence read back through the public API, one execution correlated with backend logs. Local tests alone do not satisfy this gate.

## Shared checkout

After verification, concurrent edits began renaming `EvalProvider` to `EvalSandbox` and removed the additional test assertions from the checkout. A final test attempt failed at module loading because existing callers still import `EvalProvider`. Those edits were left untouched.

The passing results above apply to the audited revision with the additional assertions, not the changing checkout. The patch preserves those assertions and has passed `git apply --check --unidiff-zero`. Apply it after coordinating the refactor with `git apply --unidiff-zero agent/validation-observability-tests.patch`, then rerun the tests. It does not fix the P0 scorer defect.

## Keep

Keep declarative TypeScript validators and `judge({ ... })`, Standard Schema at consumer boundaries, strict Effect schemas internally, scoped sandbox cleanup, organization credential resolution, immutable source snapshots, and one shared scoring implementation. No new provider framework, scorer registry, or automatic instrumentation of arbitrary user code is needed.
