# MVP

Which harness, which model, which sandbox, decided by running the work rather
than by reading a benchmark someone else ran on someone else's tasks.

## Who this is for

A company shipping a product built on somebody else's harness. They have picked
Claude Code or Codex or the Agent SDK, they run it in a sandbox, and they cannot
answer whether they picked right, or whether last week's answer still holds.

They are not improving the harness. They are choosing between harnesses, and
then defending that choice against regression.

## The three dimensions

```
                      model
                        |
                        |
                        +-------- harness
                       /
                      /
                 sandbox
```

**Harness** decides how the work is decomposed: how many commands, how much
re-reading, whether it verifies its own output. **Model** decides how well each
step is chosen. **Sandbox** decides what the machine underneath is capable of,
and it is the axis everyone treats as interchangeable substrate. It is not:
Daytona defaults to zsh, which breaks `PIPESTATUS`; E2B exposes inotify and
Daytona does not; boot differs by 128ms before any work happens.

Nobody sells the joint answer, and the joint answer is the one that matters,
because these interact. A harness that issues forty small commands is punished
by a slow sandbox in a way a nine-command harness is not. A cheap model that
retries is fine on a fast box and ruinous on a slow one.

## What is already proven

Measured against real providers during the spike, not inferred.

| | |
| --- | --- |
| Sandbox boot | E2B 296ms, Daytona 168ms |
| Harness install | `npm i -g @anthropic-ai/claude-code` in 7.4s |
| Harness runs headless | `claude -p --output-format stream-json` emits `system/init` with `session_id`, `cwd`, `model`, `permissionMode` |
| Harness honours a proxy | `ANTHROPIC_BASE_URL` respected: `duration_api_ms: 0`, never reached the real API |
| The loop closes | broken code, tests fail, agent runs, tests re-run |
| A run can be rebuilt | replayed into a fresh sandbox on E2B: 7 of 8 fields matched, the eighth a git tree hash carrying `.pyc` files |
| Two providers agree | the same task scored identically on E2B and Daytona: fails before the fix, passes after |
| A cell is repeatable | 5 Daytona trials, 5 of 5 sound, identical exit codes, wall clock spread 1.55x |
| Sandboxes boot concurrently | 5 at once on Daytona, no rate limiting |
| Nested commands are visible | a DEBUG trap caught `sh -c` inside a command, which produced no output and no journal entry |
| Exit codes are recoverable | captured at the call site, where they still exist |
| Writes nobody named | 590 file events across 246 paths from one `pip install` |

Two measured facts shape the whole design.

**A pipeline hides the failure it pipes.** `pytest | tail` exits 0 while pytest
exits 1, on both providers. The obvious fix is itself provider-specific:
`PIPESTATUS[0]` is `1` in bash and unset in zsh, which is Daytona's default
shell. Any platform trusting a reported exit code records failures as passes.

**Model tokens dominate sandbox compute by roughly 80:1.** A 3x3x3 matrix at 10
trials is about $2 of sandbox against $158 of inference, at a five-minute run
and current Sonnet pricing. The ratio moves with run length but not enough to
change any decision below.

## The unit

A **run** is one task, one harness, one model, one sandbox, executed once. A
**cell** is that combination; a **trial set** is the cell run N times. The trial
set is what gets reported, because a single agent run is not repeatable and
reporting one as though it were is the mistake the product exists to correct.

```
cell = task x harness x model x sandbox
  trials[]        N runs of that cell
  passRate        7/10, not "it passed"
  commandSpread   9 to 41 commands for the same outcome
  divergence      where the trials stopped agreeing
  cost            p50 and p95, measured at the proxy
```

A cell passing 10/10 in 9±2 commands is deterministic. One passing 7/10 in 9-41
commands is not. Today nothing distinguishes them, because everybody runs once.

## What makes a cell comparable

The hard part of three dimensions is not running the matrix. It is making the
cells mean the same thing, and this is where a naive implementation produces
confident nonsense.

**One variable moves at a time.** Same task, same repo pin, same setup, same
prompt. If the Codex cell gets a different prompt because Codex prefers a
different phrasing, the comparison measures prompt engineering.

**Every cell is scored by one instrument.** Codex records exit codes and Claude
Code does not, so scoring each by its own reporting measures two different
things. Everything is scored from our journal, captured at the call site.

**A run that never ran is rejected, not scored.** This is now enforced. The
first Daytona attempt failed every command with `fork/exec /usr/bin/zsh: no such
file or directory`, and the comparator read two identical error strings as
perfect agreement. A comparator that calls two failed runs identical eventually
reports a flawless pass rate on a broken provider.

**Provider capability differences are recorded, not smoothed.** A Daytona run
with no file events is not a clean run, it is a run where that signal does not
exist. The record says which signals were available.

**Sandbox timing is separated from model timing.** Otherwise a slow provider
looks like a slow model. The journal has per-command duration; the harness
stream has `duration_api_ms`.

## Architecture

```
customer repo
  .anpord/tasks/*/          task lives with the code it tests
        |
        v
  scheduler                 sandbox count and vCPU minutes
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

**No model key enters the sandbox.** The box gets a run-scoped token claiming
`{tenant, run, trial, cell}`; the proxy swaps it for the real key. The token is
compromisable by design, so the proxy caps what it can buy: one model, one spend
ceiling, one run. This was the largest open risk and it is answered, because
Claude Code honours `ANTHROPIC_BASE_URL`.

**Meter at the proxy, not the harness.** `total_cost_usd` is a client-side
estimate produced by the code under test. The proxy reads provider `usage`
directly. Report both: the gap between them is a real finding about harness
accounting, and nothing else surfaces it.

**One sandbox per run, never reused.** Not for isolation but for correctness.
State carried between runs silently invalidates the comparison.

**BYOK changes the product, not the architecture.** The proxy still sits in
path, still meters, still enforces the ceiling. It swaps the customer's key
instead of ours. Given the 80:1 ratio, BYOK is most of the market and the
metered tier is the premium one.

## Tasks

A directory in the customer's repository, so the task versions with the code it
tests and a regression is attributable to one or the other.

```
.anpord/tasks/fix-parser/
  task.toml         prompt, timeouts, resource limits, network policy
  environment/      repo pin, setup commands
  tests/verify.sh   the ground truth
```

Borrow Harbor's shape rather than inventing one; it is the closest prior art and
already abstracts E2B, Daytona and Modal behind one interface.

**Verification never runs through a shell string.** Execute by argv, prepend
`set -Eeuo pipefail`, prefer a machine-readable test report over an exit code.
Reject unguarded pipelines at registration rather than discovering the problem
in a result.

**The agent's own commands are left alone.** A harness that fools itself with
`pytest | tail` is a finding worth surfacing, not a defect to paper over.

## Scoring

Gates first, then weights.

- **Correctness** is a gate and boolean. The tests ran; this is what they said.
- **Efficiency** is weighted and reported: commands issued, wall clock, model
  time against machine time, files touched against files that needed touching,
  cost.
- **A judge is never a gate.** Its drift would poison the regression signal,
  which is the one thing that has to stay stable.

Every task is registered by running it twice before it is trusted: once with a
correct solution, once with nothing at all. A verifier that passes the null
agent is broken, and finding that out later costs more than finding it now.
This bracket already runs.

## What ships

**v0, done.** Two providers behind one interface, ground-truth scoring, the void
gate, repeatability at n=5. The measurement floor everything else stands on.

**v1, the trial runner.** One task, one cell, N runs, reporting pass rate and
command distribution. The first number nobody else can show.

*Ships when* a customer task registers, runs 10 trials, and reports a pass rate
with a command spread.

**v2, the matrix.** Harness x model x sandbox across the customer's tasks. This
is the wedge, because it answers the question they are actually asking. Needs
Codex alongside Claude Code, and the comparability rules above enforced rather
than documented.

*Ships when* a 2x2x2 matrix runs end to end and the report separates sandbox
time from model time.

**v3, regression.** Run-to-run diffing on execution facts: still passing, more
commands, new files, new destinations. Beta posteriors at n=8 with an explicit
inconclusive verdict rather than false precision.

*Ships when* a rerun after a model version change produces a verdict with an
interval, and says inconclusive when it is.

**v4, the joined record.** Harness stream beside sandbox truth on one timeline.
This is where a customer sees the command that reported success while exiting 1.

**v5, network.** Vercel `forwardURL` first, the only turnkey path, and dnsmasq
in a template elsewhere.

## What is cut from the MVP

**A UI beyond a report.** The finding is a table and a distribution; that ships
as CLI output and a static page before it earns a dashboard.

**More than two providers.** E2B and Daytona differ enough in shell, filesystem
signal and boot to prove the abstraction. A third adds surface, not evidence.

**Anything on the agent's own network traffic.** Only Vercel makes it turnkey.
It is v5 for that reason and it is not what the wedge rests on.

**Live observability of production agents.** Adjacent, larger, and it dilutes
the one question the product answers well.

## Open risks

**Concurrency at real scale.** 5 sandboxes at once works on Daytona. 50 is
untested, and per-account limits are where this plausibly breaks first. A matrix
is embarrassingly parallel and worthless if it takes a day.

**Harness version drift.** Claude Code and Codex ship constantly. A comparison
run last month against a version no longer reproducible is a regression signal
that degrades on its own. Pin the harness version into the cell key.

**Task authoring is the real adoption cost.** Everything here assumes a task
with ground truth exists. Most teams do not have one, and writing the first is
the work. Generating a candidate task from an existing test suite is probably
the unlock, and it is unproven.

**Cost of a matrix is a real number to a buyer.** $158 for one 3x3x3 sweep is
fine for a decision and unaffordable per commit. Regression runs must be a
narrow slice, not the full matrix.

## What this will not claim

**It does not police a hostile agent.** Everything collected in the guest is
editable by whatever runs there. Only the journal kept outside is beyond reach.
This measures agents that are behaving.

**Coverage is uneven and the record says so.** Saying otherwise would repeat the
exact failure being corrected.

**A run nobody watched cannot be reported.** Nothing on any provider can be
queried afterwards.

## Where it is weakest

The moat is normalisation and retention, because privileged access belongs to
whoever owns the runtime and cannot be bought. A provider will eventually ship a
session viewer for its own sandboxes.

None of them will compare Claude Code against Codex across models and providers,
because that is not their business. That axis is the defensible one, and it
happens to be the question customers are asking.
