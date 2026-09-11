# Resolving the audit

The audit in `anpord-audit.md` raises about forty points across the server and
every package. Nearly all of them are five recurring problems, so this plan is
organised by problem rather than by the directory each was noticed in: fixing a
theme once, everywhere, is what stops it growing back.

## What the codebase actually looks like

Measured rather than estimated, so the sequencing below is grounded.

| | count |
| --- | --- |
| TypeScript files | 1,200 |
| Lines | 90,262 |
| Tests under `src/` rather than `tests/` | 43 |
| Distinct `*Of` helpers | 119 (51 exported, 64 internal) |
| Distinct `as*` helpers | 17 |
| Files over 200 lines | 35 |
| Files over 150 lines | 90 |

Two findings change the plan:

**No `*Of` helper reaches the published SDK surface.** Checked against
`dist/index.d.mts`. Renaming them is internal, so it needs no release and
breaks no user.

**`packages/eval` holds 68 of the 119.** It is also where the audit is harshest
("wow this is going to need a lot of cleanup"). It is the centre of gravity for
every theme, and the last place to touch, because everything else informs it.

## Sequence

Ordered so that each stage makes the next one cheaper, and so the riskiest work
happens against a codebase that is already easier to read.

### 1. Move tests out of `src/`

43 files. `packages/eval` and `packages/sdk` are already mostly converted, so
the target layout is established rather than invented: `tests/` mirroring the
path of the file under test.

| area | to move |
| --- | --- |
| `apps/web` | 24 |
| `packages/eval` | 13 |
| `packages/ui` | 3 |
| `apps/server` | 2 |
| `packages/sdk` | 1 |

Pure moves plus import rewrites, verified by the suites passing with the same
counts. No behaviour changes, so it is the safest way to start and it settles
the layout question before anything else moves.

### 2. Name what a helper does

119 `*Of` and 17 `as*`. The audit is right that `answerOf` and `asStoredTrial`
say nothing about what happens inside them.

Per the repo's own standards, never a blanket replace: a rewritten declaration
with an un-rewritten body silently resolves to a global like `name` or
`length`, so it compiles and does the wrong thing. One file at a time,
`bun run typecheck` between.

Rename by what the function does, not by dropping the suffix:

| before | after |
| --- | --- |
| `asStoredTrial` | `decodeStoredTrial` |
| `answerOf` | `readAnswer` |
| `bindingsOf` | `resolveBindings` |
| `reasonOf` | `describeFailure` |

Keep a suffix only where it is genuinely a lookup and the noun carries it:
`cellKeyOf(parts)` is honest.

### 3. Separate utilities from business logic

The audit's most repeated complaint. A handler file opens with `apiError`, a
tokeniser, a formatter, then the logic that uses them, so the thing the file is
named for starts a third of the way down.

Per `code-standards`, split along seams rather than line counts. The shape
already documented there:

```
src/
  domain/         errors, views, keys, pure types
  repositories/   one per table, returns Option
  services/       one per responsibility, owns spans and logs
  layer.ts        composition
```

35 files over 200 lines are the working list, largest first. `evals.ts` at 752
lines and `ground-truth.ts` at 410 are the two worth doing first: both are
named in the audit and both are read often.

### 4. Config where there are magic numbers

`ROLE_CACHE_CAPACITY = 4096` at `session-authentication.ts:26` has no unit and
no explanation. `IMPERSONATION_SESSION_SECONDS = 60 * 60` in `packages/auth`
carries its unit in its name because the type cannot.

- A value that could differ per deployment becomes an Effect `Config`.
- A duration becomes `Duration`, so the unit is in the type.
- A true constant keeps its name but moves beside what it configures.

### 5. Centralise errors and docs

`prompt-errors.ts` sits in `http/request` while other domains keep errors
elsewhere. The repo map already says where they belong: domain errors in the
owning package's `domain/errors.ts`, transport errors in
`@anpord/schema/errors`. Move them there.

Docs: `http/authentication/README.md` is good and the audit says so. Rather
than one documentation folder, keep each next to what it documents and add a
skill that can find them, which is what the audit actually asked for.

### 6. `packages/eval`

Last, because by now every theme has a settled answer. 68 `*Of` helpers,
schemas that belong in `packages/schema`, and per-harness code that should sit
in a directory per harness rather than sharing files.

The audit's specific calls here:

- `BIN` and similar belong in a config file beside the harness that uses it.
- `authPath` reads `CODEX_AUTH_PATH`, hardcoding one harness into a generic
  path (`routes/internal/evals/credentials.ts:12`).
- `asStoredTrial` should decode with a schema rather than assert.

### Questions, not findings

Three points in the audit are open questions, and each changes real behaviour.
They need an answer before anything is written.

- **Where should the error mapping at `organizationOf` live** — in the service
  or at the boundary? The audit asks "is this the correct layer".
- **Does `apps/sandbox-bridge` need to be its own app?** 15 TypeScript files.
  Folding it in is a build and deploy change, not a refactor.
- **`withPromptErrors`** — the audit asks whether it can be generic. Whether it
  can depends on what else would use it.

## How each stage is verified

Every stage ends with the same gate, and no stage lands without it:

```
bun run typecheck      all 18 packages
bun run check          lint and formatting
bun run check:comments no comment restating the code
bun run knip           nothing unused left behind
bun run test           same counts as before the change
```

A refactor that changes a test count has changed behaviour, and that is the
signal to stop rather than update the test.
