# Rollouts

A plan for turning a channel from a pointer into a policy, without turning
anpord into a feature-flag platform.

## The decision

A channel keeps pointing at exactly one thing. That thing stops being a version
and becomes a **release**:

```
Release = Pinned  { version }
        | Rollout { version, previous, percent, exposureSalt, assignmentSalt }
```

Everything shipped today is the `Pinned` case. Not a compatibility shim — the
same object, reached by the same code path, returning the same bytes.

### Why not a separate experiment object

The tempting alternative is to leave channels alone and add an `experiment`
table that overrides them. It fails on the question a user asks in week one:
*if there is a rollout on production, what does production serve?* Two writers
means a precedence rule, and a precedence rule is invisible from either table.
One object means one answer: ask the channel.

It also breaks rollback. Today rollback is `promote(channel, oldVersion)` — one
write, one audit row. With an override table it becomes "delete the experiment",
a different verb on a different object, and a stale experiment silently outranks
a correct promotion.

### Why "rollout" and not "experiment"

The docs already say to name channels after the audience, not the version. A
channel was never defined as a version number; the pointer was the
implementation. *"60% of the production audience gets v5"* does not violate
that.

"Experiment" promises a hypothesis, a metric, a power calculation and a verdict.
We are shipping none of those. The word would be a lie told by a nav item, and
the lie is told before anyone clicks.

## The unit of assignment

The request gains one optional field:

```ts
anpord.prompts.get({ id: "support-reply", for: workspace.id })
```

`for` is an **opaque string**. We hash it and never interpret it.

### Why opaque rather than `userId`

The right unit is not always a user. Measured on a workspace-shaped product —
200 organisations, ~12 members each, rollout at 30%:

| Bucketed by | Organisations seeing two different prompts internally |
| --- | --- |
| user | **195 of 200** |
| organisation | **0 of 200** |

A field named `userId` invites the first row. Two teammates in one shared
workspace get different assistant behaviour, and the bug reads as flakiness
rather than as a bucketing choice. Naming the field `for` forces a decision the
caller is qualified to make and we are not.

The cost is real and worth stating: an opaque field can be filled in wrongly and
we cannot detect it. The mitigation is documentation, not validation — the docs
say plainly that whatever goes in `for` is the thing that stays consistent, and
the dashboard reports what share of traffic arrives without one.

### When `for` is absent

Serve `previous` — the version the channel served before the rollout started.
Deterministic, never random.

The alternatives are worse. Failing the request turns publishing a rollout into
a remote crash of every caller that has not upgraded. Assigning randomly per
call means one caller can see v4 and v5 alternately within a conversation, which
for a chat product is the most damaging possible failure.

Serving `previous` degrades to exactly the pre-rollout behaviour, which is the
only defensible default: a caller that told us nothing gets what it would have
got if the rollout did not exist.

## Assignment

```
bucket(salt, unit) = fnv32a(String(fnv32a(salt + unit))) % 10000
served = bucket(exposureSalt, for) < percent * 100 ? version : previous
```

Two salts, stored on the release, generated once.

- `exposureSalt` — fixed for the life of the rollout. Ramping only widens a gate.
- `assignmentSalt` — reserved for the day a rollout carries more than two
  versions. Unused in v1, stored from the start so adding it later is not a
  migration.

### The three numbers this design is built on

Measured, not cited:

| Property | Result |
| --- | --- |
| Ramp 10% → 30% → 60%, 100k units | **0** already-exposed units changed version |
| Cross-rollout independence, double-hashed | P(A∧B) **0.2508** against 0.2505 expected |
| Cross-rollout independence, single-pass | P(A∧B) **0.2371** — measurably correlated |

The double hash is not decoration. Bare FNV-1a is a known-dependent hash across
concurrent experiments (Kohavi et al. 2009, DMKD 18(1) §5.1.2). Both arms look
uniform in isolation, which is what makes the single-pass version dangerous: it
reads as correct until two rollouts run at once.

Assignment costs 0.115µs. Against a 4.5ms budget it does not appear.

### Operations that reshuffle, and are therefore forbidden

| Operation | Units reassigned (50k) |
| --- | --- |
| Ramp coverage 50% → 100% | **0** |
| Change relative weights 50/50 → 40/60 | **4,965** |
| Add a third version | **25,071** |

Ramping is safe and needs no warning. Weight editing and variant addition
reshuffle, so v1 does not offer them — there is one moving version and "the
rest" is a fact about the channel rather than a parameter. This is also why a
single slider must never be allowed to express both.

## Caching

This is the part that breaks if it is got wrong, and it breaks silently.

Today `PromptResolution.get` caches the fully resolved prompt under
`prompt:{org}:{id}:c:{channel}` and returns early on a hit. That is correct only
while resolution is identity-independent. Under a rollout the same key would
serve one caller's assignment to everybody, turning 30% into 0% or 100%
depending on who arrived first — with nothing in any log to say so.

Split the cache in two, both identity-independent:

| Key | Value |
| --- | --- |
| `prompt:{org}:{id}:r:{channel}` | the release — small, no content |
| `prompt:{org}:{id}:v:{n}` | resolved content for one version |

Then evaluate between them. The decision itself is never cached; it is cheaper
to compute than to look up.

**Pinned channels keep the existing single key and the existing early return.**
That is the concrete payoff of making `Pinned` a real case rather than a
degenerate rollout: every prompt shipped today pays exactly nothing.

## What goes on the wire

```ts
resolution: {
  version: VersionNumber,
  versionId: string,
  reason: "pinned" | "rollout" | "no-unit",
  percent: Percentage | null,
  resolvedAt: Instant,
}
```

`versionId` already exists internally and is dropped at the public boundary.
Surfacing it is one line and it is the only immutable receipt of what content
answered — `version: 4` is unique only within a prompt.

`reason` and `percent` are recorded at resolve time so that widening a rollout
later does not rewrite the history of what happened while it was narrow.

None of this is needed by v1's features. All of it is unbackfillable, so it goes
in from the first release.

## Interface

The prompt editor gains one line, above the composer, with fixed grammar:

```
Production serves v5 to 40% of callers, v4 to the rest.        [ Manage ]
```

Pinned reads the same way:

```
Production serves v5.                                          [ Manage ]
```

One sentence that is true in every state, so a user never has to learn a second
layout to answer the only question they have. It also fixes a current gap: the
editor never says what is live, so reading v3 gives no signal that production is
on v4.

The channels card gains a mid-rollout state:

```
production   v5  40% ▓▓▓▓░░░░░░
staging      v7
beta         not set
```

Rolling out is three fields — version, percent, and the channel — and the same
control ramps it. Finishing is `promote`, the verb that already exists.

### The confirmation

Today it reads *"Callers asking for production will receive v5."* It restates
the click and omits the one fact that makes it a decision. Every promote and
ramp dialog states both ends and the direction:

```
Production serves v4. Ramp v5 from 10% to 40% of callers?

Callers already on v5 stay on v5. This is reversible —
you can lower the percentage or cancel at any time.
```

The second paragraph matters more than the first. Rollback is the product's
best property and the interface currently never mentions it, so the dialog
raises anxiety and nothing lowers it.

### Friction, in proportion

| Action | Guard |
| --- | --- |
| Ramp a rollout up or down | none — reversible, non-reshuffling |
| Cancel a rollout | none — returns to `previous` |
| Start a rollout on a non-production channel | none |
| Start a rollout on production | confirm, naming both versions |
| Promote to all of production | confirm, naming both versions |
| Rename a channel | type-to-confirm |

Channel rename is on this list because it is the worst unguarded action in the
product today: renaming `staging` silently breaks every caller asking for
`staging`, and the dialog is a plain text field that says nothing.

## Progress

The only honest signal v1 can offer is **observed against configured**:

```
Configured   40%
Observed     38%   (1,204 of 3,015 resolves, last 24h)
Without a unit   6%   — these callers receive v4
```

It cannot say v5 is better. It catches the two failures that actually occur: the
rollout is reaching nobody, or a large share of traffic arrives without `for`
and is silently pinned to `previous`.

No verdicts, no significance, no winner. At a realistic per-arm N of hundreds,
detecting a 5% relative change needs ~57,800 per arm — a dashboard that declared
winners here would be laundering coin flips into institutional authority.

## Order of work

Each step is useful alone and safe to stop after.

1. **`Release` as an object, `Pinned` only.** New table, backfill one pinned
   release per placement, `prompt_channel.version_internal_id` kept as a
   denormalised pinned version so the list query is untouched. Zero visible
   change. Proves the migration and the cache split under real traffic before
   any behaviour depends on them.

2. **The receipt.** Surface `versionId`, add `reason`, record resolutions.
   Unbackfillable, so it precedes the feature that needs it.

3. **The production line.** One sentence in the editor header, correct in the
   pinned state, ready for the rolling one.

4. **`for` and assignment.** The double-hashed bucket function, `for` on the
   request, still only pinned releases in existence. Testable in isolation.

5. **Rollouts.** Create, ramp, cancel, promote-to-all. The feature.

6. **Observed against configured.**

Items 1 through 4 ship no user-visible feature and are most of the work. That is
the correct shape: the risk is in the resolution path and the cache, not in the
dialog.

## Not in v1

- **Targeting rules.** No attributes, no predicates, no segments. If `for`
  adoption turns out to be low, rules would be built on sand.
- **More than two versions per rollout.** Adding a third reshuffles half the
  population; the design stores `assignmentSalt` so it can arrive later.
- **Scheduled and automatic ramps.** Both need a health signal that does not
  exist. An automatic ramp without one is a timer that ships bad prompts on a
  schedule.
- **Outcome reporting, metrics, verdicts.** Deliberate. A rollout is a safety
  mechanism, not a measurement, and it is useful with no telemetry at all.
- **Anything in MCP that alters traffic.** The MCP server serves prompt content,
  which is frequently attacker-influenced, into an agent whose tools would
  include the rollout controls. Read-only `explain_resolution` only.

## Corrections carried into this plan

Two claims commonly repeated in this area are wrong and were withdrawn during
research:

- **LaunchDarkly does not guarantee that raising a rollout percentage preserves
  assignment.** Its docs state contexts are reassigned on allocation change, and
  its experiments reshuffle deliberately to avoid carryover bias. The two-seed
  design here comes from Split, not LaunchDarkly.
- **The MD5 hash-independence result is Kohavi et al. 2009 §5.1.2**, not the
  frequently-cited KDD 2013 paper, which contains no mention of MD5.
