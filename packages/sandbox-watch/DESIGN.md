# Evals for agents that run code

Braintrust scores what a model said. This scores what an agent did.

## The gap this exists to close

An eval platform sees the tool call and the string that came back. That is the
whole of its evidence, because the interface between an agent and a sandbox is
`execute(name, input) -> string`. Anthropic's own architecture names it: the
harness "called the container the way it called any other tool".

A string cannot carry an exit code, so nobody has one. Measured rather than
assumed, across six harnesses:

| Harness | Exit codes |
| --- | --- |
| Claude Code | prose on failure, nothing at all on success |
| Codex | persisted in 0.116–0.128, absent either side |
| OpenHands | structured, the only one that gets this right |
| SWE-agent | captured, then deliberately discarded |
| Aider | computed as a boolean, never written |
| Cursor | present, but no cost data anywhere |

Claude Code's shape is the sharpest. Of 6,411 real Bash calls in one machine's
transcripts, 6,343 successes recorded nothing and 68 failures appeared as the
text `Error: Exit code N`. **Silence and success are indistinguishable.** An
eval built on that record cannot tell a passing run from an unrecorded failure.

Providers do not fill the gap either. They audit who created a sandbox, never
what ran inside it. Modal states it outright: "container runtime activity is
not audited... not individual Function invocations or Sandbox `exec` calls."

## What we collect that nobody else does

Proven against E2B and Daytona, not inferred:

**Exit codes and real timing.** Every command with its status and duration,
captured at the call site where the status still exists.

**Writes nobody named.** Kernel inotify inside the sandbox. A real `pip
install -e .` produced 590 file events across 246 paths — `.git/index.lock`,
`objects/12/tmp_obj_mOoTwh`, `maintenance.lock` — none of which any command
mentioned. A client-side wrapper cannot produce this at all.

**Work that leaves no trace.** A file written and deleted is absent from the
final tree and present in the event stream. Snapshots cannot show it happened.

**Destinations.** dnsmasq inside the box names every host across every
protocol, which is the only coverage that does not depend on a client honouring
a proxy.

**A rebuildable run.** Captured a session, drove a fresh sandbox from the
recorded commands alone, and compared: commits, working tree, file contents,
dependency version, test result and the exit code of every command in order all
matched. On Daytona, eight of eight. On E2B, eight of nine, the ninth being
`.pyc` files that embed a source timestamp and therefore differ by
construction — hashing sources without the cache agreed exactly.

## The unit of measurement

Braintrust's is a scored completion. Ours is a **run**: one agent, one harness,
one model, one task, from the first command to the last.

```
run
├── task            what was asked, and how success is defined
├── harness         claude-code | codex | openhands | custom
├── model           the model the harness drove
├── commands[]      argv, exit code, duration, stdout, stderr
├── files[]         every write, including ones no command named
├── network[]       destinations by name
├── commits[]       how the code arrived at its final state
├── outcome         tests passed, and what they said
└── artefact        a bundle and a snapshot the run can be rebuilt from
```

The columns Braintrust cannot have are `commands`, `files` and `network`. The
column it has and we must not lose is cost, which the harness records and the
sandbox cannot see.

## What ships

### 1. Ground-truth scoring

A scorer that runs the tests rather than judging the diff. `pytest` exits 1 and
says `assert -1 == 5`; that is the score. No LLM in the loop, no rubric to
drift.

The failure this prevents is specific and common: a pipeline exits with its
last command, so `pytest | tail` reports the success of `tail`. We measured it
on both providers. Any platform that trusts a reported exit code silently
records failures as passes, and ours refuses piped commands for scoring.

### 2. Harness and model comparison

The question nobody answers well: Claude Code or Codex, on which model, for
this kind of work. Same tasks, same repository, a matrix of harness × model,
scored on execution rather than opinion.

Outcome is the obvious axis and the least interesting one, because on easy
tasks everything passes. The separating measures are efficiency:

- commands issued before the tests passed
- wall clock, and how much of it was the model versus the machine
- files touched against files that needed touching
- failed attempts before the first success
- cost, from the harness's own token accounting

A harness that solves the task in nine commands is better than one that takes
forty, and today nothing surfaces that.

### 3. Two records, joined

The harness knows what the agent intended, what it cost, and which subagent
spawned which. The sandbox knows what actually happened. Neither is sufficient
and both are cheap to collect.

```
harness stream                    sandbox collector
  intent, tokens, cost,             exit codes, real argv,
  diffs, subagent tree              writes, destinations, timing
        └──────── session id + timestamp ────────┘
```

Capture the stream rather than the files: `claude -p --output-format
stream-json` and `codex exec --json` are both complete live records, and
Codex's `--json` is the only place its exit codes durably appear.

Subagent nesting is worth taking seriously because it is free and rare.
`parent_tool_use_id` is null on the main thread and carries the spawning call's
id at every depth, so the whole tree reconstructs. Most tools flatten it.

### 4. Replay

A snapshot that boots in under a second and answers what the agent left, how it
got there, and whether the tests pass in the restored state. Not a resumption
point: a record you can interrogate after the sandbox is gone.

Cheap, because git does the work. A commit per turn is content-addressed and
deduplicated, and `git bundle` put a full history in 696 bytes.

### 5. Regression across runs

Two runs of the same task diffed the way Braintrust diffs experiments, but on
execution facts: did it still pass, did it take more commands, did it start
touching files it did not touch before, did it reach a host it never reached.

The last one is the one that matters and the one nothing else can answer.

## What we will not claim

**It is not a security control.** Everything collected inside the guest is
editable by whatever runs there. Only the client-side journal sits outside the
sandbox's reach. This measures agents that are behaving; it cannot police one
that is not, and saying otherwise would be dishonest about the trust model.

**Coverage varies by provider, and the record says so.** A Daytona run with no
file events is not a clean run, it is a run where that signal did not exist.
Silently thinning would repeat the exact failure we are correcting.

| | E2B | Daytona | Vercel | Modal | Cloudflare |
| --- | --- | --- | --- | --- | --- |
| commands, exit codes | yes | yes | yes | yes | yes |
| file events | yes | no | no | no | yes |
| network requests | no | no | yes | no | no |
| collector at boot | yes | yes | no | yes | yes |
| enumerate after death | partial | yes | yes | no | no |

**We must be attached while it runs.** Nothing on any platform can be queried
afterwards. A run we did not watch is a run we cannot report.

## Where this is weakest

The moat is normalisation and retention, not privileged access, because
privileged access is not available to anyone but the provider. Whoever owns the
runtime can ship this, and Vercel already terminates TLS on every request
without logging it.

That argues for going where the providers will not: the harness axis. A
provider will build a session viewer for its own sandboxes. None of them will
compare Claude Code against Codex across models, because that is not their
business, and it is the question their customers are actually asking.

## Build order

1. **Ground-truth scoring on one provider.** The smallest thing that beats an
   LLM judge, and it already works.
2. **Harness comparison.** Claude Code and Codex over the same tasks, scored on
   execution and efficiency. This is the wedge.
3. **The joined record.** Harness stream plus sandbox collector, one timeline.
4. **Regression.** Run-to-run diffing on execution facts.
5. **Network.** Vercel `forwardURL` first, since it is the only turnkey path,
   and dnsmasq in a template everywhere else.
