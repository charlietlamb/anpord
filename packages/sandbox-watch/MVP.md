# MVP

Which harness, which model, which sandbox — decided by running the work rather
than by reading a benchmark someone else ran on someone else's tasks.

## Who this is for

A company shipping a product built on somebody else's harness. They have picked
Claude Code or Codex or the Agent SDK, they run it in a sandbox, and the
question they cannot answer today is whether they picked right, and whether
last week's answer still holds.

They are not improving the harness. They are choosing between harnesses, and
then defending that choice against regression.

## What is already proven

Every claim below was measured against real providers during the spike, not
inferred.

| | |
| --- | --- |
| Sandbox boot | E2B 296ms, Daytona 168ms |
| Harness install | `npm i -g @anthropic-ai/claude-code` in 7.4s |
| Harness runs headless | `claude -p --output-format stream-json` emits `system/init` with `session_id`, `cwd`, `model`, `permissionMode` |
| Harness honours a proxy | `ANTHROPIC_BASE_URL` respected: `duration_api_ms: 0`, never reached the real API |
| The loop closes | broken code, tests fail, agent runs, tests re-run |
| A run can be rebuilt | replayed into a fresh sandbox on E2B: 7 of 8 fields matched, the eighth being a git tree hash that carried `.pyc` files. Not yet demonstrated on any second provider. |
| Exit codes are recoverable | captured at the call site, where they still exist |
| Writes nobody named | 590 file events across 246 paths from one `pip install` |

Two things that shape the whole design were also measured:

**A pipeline hides the failure it pipes.** `pytest | tail` exits 0 while pytest
exits 1, on both providers. And the obvious fix is itself provider-specific:
`PIPESTATUS[0]` is `1` in bash and unset in zsh, which is Daytona's default
shell.

**Model tokens are ~100x sandbox compute.** A 3x3x3 matrix at 10 trials costs
about $1.49 of sandbox and $132-176 of inference. Everything about pricing and
architecture follows from that ratio.

## The unit

A **run** is one task, one harness, one model, one sandbox, executed once. A
**trial set** is the same cell run N times, and it is the trial set rather than
the run that gets reported, because a single agent run is not repeatable and
reporting one as though it were is the mistake the product exists to correct.

```
cell = task x harness x model x sandbox
  trials[]        N runs of that cell
  passRate        7/10, not "it passed"
  commandSpread   9 to 41 commands for the same outcome
  divergence      where the trials stopped agreeing
  cost            p50 and p95, measured at the proxy
```

A cell that passes 10/10 in 9±2 commands is deterministic. One that passes 7/10
in 9-41 commands is not, and today nothing distinguishes them because everybody
runs once.

## Architecture

```
customer repo
  .anpord/tasks/*/          task lives with the code it tests
        |
        v
  scheduler                 two-dimensional: sandbox count and vCPU minutes
        |
        v
  sandbox (one per run, never reused)
    harness  --------------> LLM proxy ------> Anthropic / OpenAI
      |                        holds the real key
      |                        meters real usage
      |                        enforces the spend ceiling
      v
    collector                exit codes, argv, writes, destinations
        |
        v
  run record                joined on session id
```

Three decisions worth stating plainly.

**No model key ever enters the sandbox.** The box gets a run-scoped token whose
claims are `{tenant, run, trial, cell}`; the proxy swaps it for the real key.
The token is compromisable by design, so the proxy caps what it can buy: one
model, one spend ceiling, one run. This was the largest open risk and it is
answered — Claude Code honours `ANTHROPIC_BASE_URL`.

**Meter at the proxy, not the harness.** `total_cost_usd` is a client-side
estimate produced by the code under test. The proxy reads provider `usage`
directly. Report both: the difference between them is a real finding about
harness accounting, and nothing else surfaces it.

**One sandbox per run, never reused** — not for isolation but for correctness.
State carried between runs silently invalidates the comparison.

## Tasks

A directory in the customer's repository, so the task versions with the code it
tests and a regression can be attributed to one or the other.

```
.anpord/tasks/fix-parser/
  task.toml         prompt, timeouts, resource limits, network policy
  environment/      repo pin, setup commands
  tests/verify.sh   the ground truth
```

Borrow Harbor's shape rather than inventing one; it is the closest prior art
and already abstracts E2B, Daytona and Modal behind one interface.

Two rules that exist because of measured failures:

**Verification never runs through a shell string.** Execute by argv, prepend
`set -Eeuo pipefail`, and prefer scoring a machine-readable test report over an
exit code. Reject unguarded pipelines when a task is registered rather than
discovering the problem in a result.

**The agent's own commands are left alone.** A harness that fools itself with
`pytest | tail` is a finding worth surfacing, not a defect to paper over.

## Scoring

Gates first, then weights.

- **Correctness** is a gate and boolean. The tests ran, and this is what they
  said.
- **Efficiency** is weighted and reported: commands issued, wall clock, model
  time against machine time, files touched against files that needed touching,
  cost.
- **A judge is never a gate.** Its drift would poison the regression signal,
  which is the one thing that has to stay stable.

Every task is registered by running it twice before it is trusted: once with a
correct solution and once with nothing at all. A verifier that passes the null
agent is broken, and finding that out later costs more than finding it now.

## What ships

**v1 — the trial runner.** One task, one cell, N runs, reporting pass rate and
command distribution. Small, works with what exists, and produces a number
nobody else can show.

**v2 — the matrix.** Harness x model x sandbox on the customer's tasks, scored
on execution and efficiency. This is the wedge, because it answers the question
they are actually asking.

**v3 — regression.** Run-to-run diffing on execution facts: still passing, more
commands, new files, new destinations. Beta posteriors at n=8 with an explicit
inconclusive verdict rather than a false precision.

**v4 — the joined record.** Harness stream beside sandbox truth on one
timeline, which is where a customer sees the command that reported success
while exiting 1.

**v5 — network.** Vercel `forwardURL` first, since it is the only turnkey path,
and dnsmasq in a template elsewhere.

## What this will not claim

**It does not police a hostile agent.** Everything collected inside the guest is
editable by whatever runs there. Only the journal kept outside is beyond reach.
This measures agents that are behaving.

**Coverage is uneven and the record says so.** A Daytona run with no file events
is not a clean run; it is a run where that signal did not exist. Saying
otherwise would repeat the exact failure being corrected.

**A run nobody watched cannot be reported.** Nothing on any provider can be
queried afterwards.

## Where it is weakest

The moat is normalisation and retention, because privileged access belongs to
whoever owns the runtime and cannot be bought. A provider will eventually ship
a session viewer for its own sandboxes.

None of them will compare Claude Code against Codex across models and
providers, because that is not their business. That axis is the defensible one,
and it happens to be the question customers are asking.
