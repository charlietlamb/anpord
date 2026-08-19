# Implementation

MVP.md is what the product is. This is how it gets built, in order, with the
user's experience of each step treated as part of the work rather than a layer
added afterwards.

## The experience we are aiming at

Three commands carry the whole product. Everything below exists to make one of
them honest.

```
anpord eval init          turn a repo into a task, without the user writing one
anpord eval run           run a cell N times, report a distribution
anpord eval compare       run the matrix, name a winner and say how sure we are
```

Two principles decide every UX call.

**The terminal is the product, not a client for it.** The buyer is an engineer
choosing a harness. They are already in a terminal, the answer is a table, and a
dashboard would be a slower way to read it. A web view earns its place only for
the timeline in path 5, where scrubbing beats scrolling.

**Never report a number the run does not support.** The failure this product
corrects is confident nonsense: a comparator that called two crashed runs
identical. Every surface says how many trials, how wide the spread, and when it
does not know. `inconclusive` is a first-class verdict and shipping it early is
what makes the confident verdicts believable.

The CLI grammar follows the existing one in `packages/sdk/src/cli`: results on
stdout so they pipe, status on stderr, `--json` on every command that prints a
finding. New verbs go under `anpord eval` rather than into a second binary.

---

## Path 1: the trial runner

The smallest thing that produces a number nobody else can show.

**What exists.** `apps/sandbox-lab/src/providers.ts` runs a task identically on
E2B and Daytona. `checkVoid` rejects a run that never ran. Both are verified.

**What gets built.** Lift the lab script into a real package: a task loaded from
a directory, N trials of one cell run concurrently, a result written as one
record per trial and a summary over them.

```
packages/eval/
  task.ts         load and validate a task directory
  cell.ts         task x harness x model x sandbox, and its key
  trial.ts        one run, journalled, voided or scored
  set.ts          N trials, pass rate, spread, divergence
```

The cell key is a content hash over task, harness version, model id and provider.
Pinning the harness version here is what stops last month's comparison decaying
silently when Claude Code ships.

**Concurrency.** Trials are independent, so run them at once and cap the pool.
5 concurrent is measured on Daytona; the cap is configurable and defaults low
until 50 is tested. Effect's `Effect.all` with `concurrency` owns this, not a
hand-rolled loop.

**UX.** A trial set takes minutes, so silence is the wrong default. Progress is
one line per trial that resolves in place, then a summary.

```
$ anpord eval run fix-parser --trials 10

  fix-parser · claude-code 2.1.4 · sonnet-4.6 · daytona

  ●●●●●●●○○○   7/10 complete

  pass rate     7/10
  commands      9 to 41   (p50 14)
  wall clock    2m04s     (p50 11.2s per trial)
  voided        0

  not deterministic: 3 trials failed, and the passing trials
  disagree by 32 commands
```

That last line is the product. A pass rate alone reads as a grade; naming the
disagreement is what an engineer can act on.

**Ships when** a task registers, runs 10 trials, and prints a pass rate with a
command spread.

**Risk.** A cell that is slow makes the loop unusable before it is useful. If
p50 exceeds a few minutes, trial counts drop and the statistics weaken, so
measure wall clock per trial from the first day and treat a regression in it as
a bug rather than an observation.

---

## Path 2: task authoring

Listed second because it is the real adoption cost, not because it is easy. Every
other path assumes a task with ground truth exists. Most teams have none, and
writing the first by hand is where a trial ends.

**The unlock.** A repository with a passing test suite already contains ground
truth. `anpord eval init` reads it, proposes a task, and shows the user what it
found rather than asking them to author from nothing.

```
$ anpord eval init

  reading . ................ python, pytest, 148 tests
  running the suite ........ 148 passed in 4.1s
  proposing a task ......... revert one commit, ask the agent to restore it

  proposed  .anpord/tasks/restore-parser-fix/
            prompt     "the parser rejects valid input, fix it"
            setup      pip install -e .
            verify     pytest tests/test_parser.py -q
            baseline   fails before, passes after   verified

  write this task? [Y/n]
```

**Registration is a bracket, not a save.** A proposed task is run twice before it
is trusted: once with the known fix, once with nothing. A verifier that passes
the null agent is broken. This already runs in `apps/sandbox-lab/src/eval.ts`
and is the single highest-value thing to surface, because the user learns their
task is sound before spending money on a matrix.

**Rejections are shown, not swallowed.** A task whose verify step pipes through
`tail` is rejected at registration with the reason, since `pytest | tail` exits 0
while pytest exits 1. The user sees the finding immediately rather than as a
suspiciously perfect pass rate later.

**Ships when** `init` proposes a task from a real repo, brackets it, and writes a
directory the runner accepts.

**Risk, and it is the largest in the plan.** Proposal quality is unproven. If the
generated task is trivial or unrepresentative, everything downstream measures the
wrong thing convincingly. Mitigation is that the bracket makes a bad task visible
rather than silent, and that a hand-written task is always accepted. Spike this
before building path 3.

---

## Path 3: the matrix

The wedge. Same tasks across harness, model and sandbox, scored on execution.

**What gets built.** A second harness adapter, the comparability rules enforced
in code, and a scheduler that runs cells rather than trials.

The harness adapter is the substantial piece. Claude Code and Codex differ in
invocation, stream format and what they record, and the whole point is that
neither is scored by its own instrument.

```
packages/eval/harness/
  claude-code.ts   claude -p --output-format stream-json
  codex.ts         codex exec --json
  stream.ts        both normalised to one event shape
```

**Enforced, not documented.** The comparability rules in MVP.md become
registration-time checks: same prompt across cells, one scoring instrument,
capability differences recorded per provider, sandbox time separated from model
time. A rule that lives only in prose is a rule that gets violated during a
deadline.

**UX.** The matrix output is the moment the product justifies itself, so it
should read as a finding rather than a data dump. Sort by the thing being
decided, show the spread beside every number, and mark what is not separable.

```
$ anpord eval compare --harness claude-code,codex --model sonnet-4.6,haiku-4.5

  fix-parser · 4 cells · 10 trials each · 40 runs · $6.20

  harness       model        pass    commands      cost
  claude-code   sonnet-4.6   10/10   12 ±3        $0.58
  codex         sonnet-4.6    9/10   17 ±9        $0.71
  claude-code   haiku-4.5     8/10   19 ±6        $0.09
  codex         haiku-4.5     4/10   38 ±21       $0.14

  claude-code + sonnet-4.6 wins on reliability
  claude-code + haiku-4.5 is 6x cheaper at 8/10

  sandbox made no measurable difference on this task
```

The last line matters as much as the winner. Reporting that an axis did not
separate is a real finding, and suppressing it would let the user believe the
sandbox choice was validated when it was merely unexamined.

**Ships when** a 2x2x2 runs end to end and the report separates sandbox time
from model time.

**Risk.** Cost is a real number to a buyer. A full sweep is fine for a decision
and unaffordable per commit, so `compare` estimates before it spends and asks
once above a ceiling.

---

## Path 4: regression

A comparison is only worth running if it can be defended next month.

**What gets built.** Run-to-run diffing on execution facts: still passing, more
commands, new files touched, new destinations reached. Beta posteriors at n=8
with an explicit inconclusive band, because 7/10 against 9/10 is not a
regression and reporting it as one destroys trust in every other verdict.

**UX.** This runs in CI, so the primary surface is an exit code and one
paragraph. Verbosity is the enemy; a diff nobody reads is a diff that gets
disabled.

```
$ anpord eval regress --against last-green

  fix-parser · claude-code 2.1.5 · sonnet-4.6 · daytona

  pass rate     9/10 → 6/10      regression  (p=0.04)
  commands      12 ±3 → 26 ±11   worse
  new writes    ~/.cache/uv      not seen before

  harness version changed: 2.1.4 → 2.1.5
```

Naming the changed dimension is what turns an alert into a cause. The cell key
already carries harness version, model id and provider, so the diff can say
which one moved without the user reconstructing it.

**Ships when** a rerun after a version change produces a verdict with an
interval, and says inconclusive when the evidence is thin.

---

## Path 5: the joined record

Where a customer sees the command that reported success while exiting 1.

**What gets built.** The harness stream and the sandbox journal on one timeline,
joined on session id and timestamp. The collector already produces the sandbox
half, including nested commands the harness never reported.

This is the one surface where a web view beats the terminal, because the value is
in scrubbing a timeline and expanding a command, which a scrollback cannot do.
It is deliberately last: it is the most expensive surface and it explains a
finding rather than producing one.

**Path 6, network,** stays where MVP.md puts it. Vercel `forwardURL` is the only
turnkey path and dnsmasq in a template covers the rest.

---

## Order and why

1. **Trial runner**, extends what is already verified, produces the first real
   number
2. **Task authoring**, gates adoption, and the largest unproven assumption
3. **Matrix**, the wedge, and it needs the first two to mean anything
4. **Regression**, converts a one-off decision into a subscription
5. **Joined record**, explains findings the earlier paths surface

Paths 1 and 2 are the ones I would build now. Path 2 is the one I would spike
first, because if task proposal does not work, the whole plan is a tool for
people who have already done the hard part.
