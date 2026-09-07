# Model comparisons

18 cases per model: lookup, stock filtering, inventory value, cheapest available item, recovery after a missing item, and honest missing-item reporting. Each runs over MCP, CLI and HTTP against the same local inventory.

Validators require recorded requests in order, the specified transport, and an exact JSON answer. They reject guessed answers without calls, extra fields, malformed JSON and incorrect arithmetic. These deterministic checks do not need an LLM judge; the existing CI smoke suites cover judges separately.

## Run Claude Code

In **Anpord CI → Settings → Harnesses**, add a shared **Claude Code** connection with an Anthropic API key. This integration currently supports API keys, not Claude subscription login. Model and sandbox credentials are not embedded in eval files.

Make the connection available to **Everyone in the organization**, set it as the Claude default, and choose **Verify**. A personal connection cannot authenticate CI runs. The Anthropic key stays in Anpord; GitHub only needs the existing `ANPORD_API_KEY` repository secret for the same organization.

Run the **Model comparisons** GitHub workflow with `claude-smoke` first. It creates one file in one Haiku trial, checking installation, credentials, agent execution and scoring before the larger matrix. After it passes, select `claude` for all 54 comparison trials. The workflow is available after these files are merged into the default branch.

Locally, with `ANPORD_API_KEY` configured:

```sh
bun run --cwd packages/sdk build
cd apps/e2e
bunx --no-install anpord eval src/evals/comparison/claude-smoke.eval.ts
bunx --no-install anpord eval src/evals/comparison/claude.eval.ts
```

`claude.eval.ts` runs Haiku 4.5, Sonnet 5 and Opus 5 through the actual Claude Code CLI on E2B. `codex.eval.ts` compares Sol and Terra through Codex. Explicit model IDs avoid moving `sonnet` or `opus` aliases. Availability still depends on the connected account. [Claude model IDs](https://platform.claude.com/docs/en/models/overview), [headless Claude Code](https://code.claude.com/docs/en/headless).

The default is one trial per cell: 54 trials for Claude or 36 for Codex. This is a wiring and capability check, not a reliability estimate. For three repetitions, split the matrix into one model per eval file: 18 cases × 1 model × 3 trials = 54 trials. Keeping the full matrices with three repetitions would exceed the 100-trial run limit. Larger matrices are manual-only; ordinary PR smoke tests are unchanged.

No product credentials or external product API are configured. Fixtures are local. Agent inference still contacts its model provider and is billed there. The prompt forbids external APIs; it is not a network-egress security test.

The dashboard shows cases, model variants, trial calls and validator evidence. Open the workflow artifact for run IDs and failures. A green local test run verifies mocks and validator packaging, not a successful hosted agent run.
