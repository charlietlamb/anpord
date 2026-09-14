---
name: repo-hygiene
description: The habits that keep this repo readable as it grows — where a test lives, what a helper is called, keeping utilities out of business logic, and config instead of magic numbers. Use when adding a file, naming a function, or reviewing a module that has grown hard to follow. Written from a full audit of the codebase; pairs with code-standards, which owns module structure.
---

# Repo Hygiene

Every rule here came from auditing this codebase and finding the same thing in
many places. `code-standards` owns how a module is shaped; this owns the habits
that decide whether the next one is readable.

## Tests Live in `tests/`, Mirroring `src/`

A test beside its subject doubles the length of every directory listing, so the
files a reader is looking for sit among files they are not.

```
packages/eval/src/services/agent-trial.ts
packages/eval/tests/services/agent-trial.test.ts
```

The path under `tests/` matches the path under `src/`, so the test for a file
is found by substitution rather than by search.

One exception, and only one: a test that exercises a module's private surface
and would otherwise force an export exists to avoid widening the API. Write
down why in the file.

## Name a Function by What It Does

`answerOf`, `bindingsOf`, `asStoredTrial` describe their return type and say
nothing about what happens inside. A reader has to open the function to learn
whether it reads, decodes, computes, or fetches.

| Instead of | Write | Because |
| --- | --- | --- |
| `asStoredTrial` | `decodeStoredTrial` | It decodes, and can fail |
| `answerOf` | `readAnswer` | It reads from the journal |
| `credentialOf` | `resolveCredential` | It returns an Effect that can fail |
| `readinessOf` | `describeUnreadiness` | It returns problems, not readiness |
| `reasonOf` | `describeFailure` | It renders a message for a person |

A `*Of` suffix survives only where the function is a plain lookup and the noun
carries the meaning: `cellKeyOf(parts)` is honest, because there is nothing to
say beyond which key. Most of them are: of the 63 in `packages/eval`, four
needed renaming. Read what the function does before assuming the suffix is
wrong, and be most suspicious of a name that describes the opposite of what
comes back.

Never rename with a blanket find and replace. It rewrites the declaration and
leaves the body referencing the old name, which silently resolves to a global
like `name`, `length` or `status`: the code compiles and does the wrong thing.
One file at a time, `bun run typecheck` between.

## Utilities Do Not Live Above Business Logic

A file that opens with an error constructor, a formatter and a tokeniser before
reaching the handler it is named for makes a reader scroll past the scaffolding
to find the point.

Move them out by what they are:

```
domain/       pure values, errors, keys, types
utils/        shaping and formatting with no dependencies
services/     behaviour, spans, logs
layer.ts      composition
```

A helper used by one file, small enough to read at a glance, may stay in it.
The test is whether the file still opens with the thing it is named for.

## A Line Count Is a Prompt, Not a Verdict

A long file is worth opening. It is not automatically worth splitting, and
splitting one that does not need it makes the code worse.

Leave it alone when the length is the responsibility:

- A port or contract: input types, the shape, the tag, and the one layer that
  implements it. Separating a tag from its only layer helps nobody.
- A vendored primitive. Splitting it breaks the next upgrade.
- Data. Icon paths and fixtures are long because the data is long.

Split it when the file opens with something other than the thing it is named
for, or when it holds several components and the exported one is last. The
question is what a reader meets first, not how far they scroll.

## Config, Not a Number at the Top of a File

`const ROLE_CACHE_CAPACITY = 4096` states neither its unit nor why that value.
Three cases, three answers:

- **Differs per deployment** — an Effect `Config`, so it is set rather than
  edited.
- **A span of time** — a `Duration`, so the unit is in the type rather than in
  the name. `Duration.hours(1)`, never `60 * 60`.
- **Genuinely constant** — keep it, and put it beside what it configures rather
  than at the top of a file that also does something else.

## Errors Belong to Their Domain

A domain's errors live in that package's `domain/errors.ts` as
`Data.TaggedError`, carrying no status codes. Transport errors live in
`@anpord/schema/errors` with their HTTP annotations. Mapping between them
happens in one file per domain under `apps/server/src/http/`.

An error file in the folder that happens to throw it means the next domain will
put its own somewhere else again.

The mapper is one exported wrapper the handlers pipe through:

```ts
export const withEvalErrors = <A, R>(
  effect: Effect.Effect<A, EvalDomainError, R>
) => Effect.catchAll(effect, toHttpError);
```

Switch on `_tag` with a `default` that takes `error satisfies never`, so a new
domain error is a type error rather than a silent 500. A store failure is a
defect: log it, then `Effect.die`.

Mapping inline in a handler is how the same domain error ends up a 404 on one
endpoint and a 409 on another, which is what `packages/eval` had across four
handlers before this was centralised. Boundary validation is the exception and
stays in the handler: a request that breaks a limit or names an id that does
not exist was never a domain failure.

## Documentation Sits Beside What It Documents

A README explaining an authentication flow belongs in that folder, where
someone changing the flow will see it. Moving every document into one
documentation directory separates them from the code they describe, and they go
stale unread.

## Comments Carry Why, Never What

A comment restating the line below it is noise that has to be maintained. A
comment naming a constraint, an invariant, or an alternative that was rejected
earns its place. Enforced by `bun run check:comments`, which also caps a block
at three lines.

## Before a Change Lands

```bash
bun run typecheck      # all 18 packages
bun run check          # lint and formatting
bun run check:comments # no comment restating the code
bun run knip           # nothing unused left behind
bun run test           # the same counts as before
```

A refactor that changes a test count has changed behaviour. That is the signal
to stop and understand why, not to update the test.

Two failures the gate alone will not catch:

A dynamic `import()` is not resolved by `tsc`, so moving a file it names
typechecks clean and fails at runtime. Grep for the old path as a string.

A rename that collides with an existing public name compiles perfectly while
silently changing a contract. Check the new name is free across the repo before
renaming into it, not after.
