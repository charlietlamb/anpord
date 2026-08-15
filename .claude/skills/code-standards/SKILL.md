---
name: code-standards
description: Structural standards for this repo — single responsibility, open/closed, small scoped files, and preferring Effect's built-ins over hand-rolled logic. Use when writing or reviewing any TypeScript module, especially services, layers, and schema definitions. Read before creating a new file or when a file grows past ~150 lines.
---

# Code Standards

Applies to every TypeScript file in this repo. Pairs with the `effect` and
`effect-composition` skills — read those for Effect idiom, this for structure.

## Single Responsibility

One file, one reason to change.

- A file that defines domain types, runs queries, and shapes HTTP responses has
  three reasons to change. Split it.
- Name the file after the one thing it does. If the honest name needs "and" or
  "utils", the file is doing too much.
- A service module wires dependencies and exposes behaviour. It does not also
  own SQL construction, cache key formats, or serialisation.

Split a service by the shape of its work:

```
src/
  schema.ts        # contracts, derived types
  errors.ts        # tagged errors
  keys.ts          # cache key construction
  repository.ts    # persistence, returns domain values
  service.ts       # orchestration, spans, logs
  layer.ts         # composition
```

## Open/Closed

Extend by adding, not by editing.

- Prefer a new module over a new branch in an existing `switch`.
- Add capability by composing another `Layer`, not by widening an existing one.
- When behaviour varies, pass it in (a `Schedule`, a resolver, a strategy) rather
  than growing conditionals inside the callee.
- Tagged unions over boolean flags: adding a case should be additive and
  exhaustiveness-checked, not a new `if` in five places.

## File Size

- Target under 150 lines. Past 200, split before adding more.
- A file you must scroll to understand is already too large.
- Extracting three lines used twice is premature; extracting a coherent
  responsibility is not. Split along seams, not line counts.

## Use Effect's Built-Ins

Never hand-roll what Effect provides. Check the API before writing a helper.

| Instead of | Use |
| --- | --- |
| `Date.now()`, `new Date()` | `Clock.currentTimeMillis` |
| `Math.random()`, `crypto.randomUUID()` | `Random`, or an injected id service |
| manual retry loops | `Effect.retry` + `Schedule` |
| `try/catch` around promises | `Effect.tryPromise` |
| `Promise.all` | `Effect.all` (set `concurrency`) |
| `setTimeout` | `Effect.sleep`, `Effect.timeout` |
| ad hoc `Error` subclasses | `Data.TaggedError` |
| nullable returns | `Option` |
| hand-written validators | `Schema` |
| `process.env` reads | `Config` |
| manual resource cleanup | `Effect.acquireRelease` |
| bare `console.log` | `Effect.log*` + `Effect.annotateLogs` |
| caching by hand | `Effect.cached`, `Effect.cachedWithTTL` |

Reach for the platform before the ecosystem, and the ecosystem before your own
implementation.

## Schema At Boundaries

Anything crossing a process boundary — HTTP, queue, cache payload, SDK contract —
is defined with `effect/Schema`, in a shared package, and types are derived.

```ts
export const PromptView = Schema.Struct({
  name: Schema.String,
  version: Schema.Int,
});

export type PromptView = typeof PromptView.Type;
```

Never hand-write an interface that duplicates a schema. Decode at the edge so the
inside of the system holds only validated values.

Internal-only shapes that never cross a boundary may stay plain interfaces.

## Renaming Across Files

Never rename a symbol with a blanket find/replace. It rewrites declarations but
leaves bodies referencing the old name, which silently resolves to a global
(`name`, `length`, `status`) instead of failing — the code compiles and does the
wrong thing at runtime.

Rewrite each affected file deliberately, then verify with `bun run typecheck`
before moving on. If more than a handful of files are affected, rewrite whole
files rather than patching lines.

## Naming

- Files kebab-case, matching their main export.
- Import from defining modules; do not add re-exports or barrel files.
- No `utils.ts`, `helpers.ts`, `misc.ts`, `common.ts` — name the responsibility.
- Tagged errors read as facts: `PromptNotFound`, `VersionConflict`.
- Spans read `Service.method`: `Prompts.create`.

## Comments

Explain *why*, never *what*. A comment restating the code is noise; a comment
naming a constraint, an invariant, or a rejected alternative earns its place.
Prefer clearer names and smaller functions over explanation.

## Validation

After any structural change:

```bash
bun run check
bun run typecheck
bun run test
bun run knip
```
