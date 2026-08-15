---
name: repo-map
description: Where everything lives in this repo and the rules that cross package boundaries — actors, ids, schemas, errors, layers, caching. Read before adding a package, a service, an API endpoint, a table, or anything that needs an id or crosses a process boundary.
---

# Repo Map

Bun workspaces + Turbo. Read this before adding anything; pair with
`code-standards` for structure and `effect` / `effect-composition` for idiom.

## Packages

| Package | Owns | Depends on |
| --- | --- | --- |
| `@anpord/schema` | Wire contracts, branded types, HTTP API groups, auth middleware tag | nothing |
| `@anpord/ids` | Prefixed id generation | nothing |
| `@anpord/db` | Drizzle schema, pool, migrations | — |
| `@anpord/cache` | Redis behind a `Cache` tag | — |
| `@anpord/auth` | Better Auth, sessions, magic links | `db` |
| `@anpord/prompts` | Prompt domain | `schema`, `ids`, `db`, `cache` |
| `@anpord/ui` | React components | — |
| `@anpord/sdk` | Published npm client (`anpord`) | — |
| `apps/server` | HTTP handlers, layer composition. Port 3003 | all |
| `apps/web` | TanStack Start frontend. Port 3005 | `ui`, `auth` |

`schema` and `ids` depend on nothing. Keep it that way — everything else may
import them.

## Actor

`Actor` is the authenticated caller: `{ id: UserId, organizationId: OrganizationId }`.

- Defined once in `@anpord/schema/actor`. Never redeclare it.
- Both ids are branded, so they cannot be transposed.
- Decoded at the auth boundary (`apps/server/src/http/authentication.ts`) and
  provided as `CurrentActor`.
- Every service method that touches org data takes `Actor` first.
- `actor.organizationId` scopes every query; `actor.id` is the attribution
  written to `created_by` / `updated_by` / audit rows.
- Do not call it `user` — `user` is the person record in `@anpord/db`, and an
  actor may later be an API key.

## Identifiers

Rows that callers address by a handle carry three fields:

| Field | Example | Role |
| --- | --- | --- |
| `internal_id` | `pmt_9EKR3ZHZ…` | primary key; every FK points here. Immutable. |
| `id` | `hello-world` | the handle in API paths and the SDK. Slug-shaped, unique per org, **mutable**. |
| `name` | `Hello World` | display text. Not an identifier, not unique. |

- Foreign keys reference `internal_id`, never `id`, so changing a handle never
  rewrites another table.
- Cache keys use the public `id`, so a resolve is one cache read with no lookup
  first. A rename must invalidate both the old and new handle.
- Wire contracts expose `id` and `name`; `internal_id` never crosses the wire.
- Rows nobody names (versions, channel events, sessions) need only
  `internal_id`. Add the split when the caller chooses the identifier *and*
  something else references the row.

## Ids

All generated ids come from `@anpord/ids`. Never call `crypto.randomUUID()` or
`Math.random()` directly.

```ts
const id = yield* ids.generate("prompt"); // pmt_9EKR3ZHZF24TFM16N0WJ72H
```

- Prefixes live in `packages/ids/src/prefixes.ts`. Add entries; never rename
  them — they are stored in rows and customer integrations.
- Prefixes are descriptive, not minimal: prefer `chev` over `evt` so a generic
  name stays free for a generic concept.
- Suffix is Crockford base32 (no I, L, O, U), generated via Effect's `Random`,
  so a seeded runtime gives stable ids in tests.

## Schema

`effect/Schema` at every process boundary — HTTP, cache payloads, SDK contracts.

- Contracts live in `@anpord/schema`, never in a domain package.
- Derive types: `export type X = typeof X.Type`. Never hand-write a duplicate
  interface.
- Brand anything a bare `string`/`number` could be confused with:
  `PromptName`, `ChannelName`, `VersionNumber`, `UserId`, `OrganizationId`.
- Decode at the edge; never cast with `as`. A cast asserts something unchecked
  and lets malformed stored data flow through as valid.
- Timestamps crossing both the store and the cache use
  `Schema.Union(Schema.DateFromSelf, Schema.Date)` — rows arrive as `Date`,
  cached JSON as an ISO string, and picking either alone silently breaks the
  other path (the cache read misses forever and every request hits Postgres).
- URL params arrive as strings: use a `FromString` variant
  (`VersionNumberFromString`), not the branded number.

## Errors

- Domain errors are `Data.TaggedError` in the owning package's `domain/errors.ts`.
  They carry no status codes.
- Transport errors are `Schema.TaggedError` in `@anpord/schema/errors` with
  `HttpApiSchema.annotations({ status })`.
- Mapping happens in one file per domain in `apps/server/src/http/`. Handlers
  never construct HTTP errors themselves.
- A store failure is a defect (`Effect.die`), not a client-correctable error.

## Services and repositories

Domain packages split by responsibility:

```
src/
  domain/         errors, views, keys, pure types
  repositories/   one per table, returns Option, no business rules
  services/       one per responsibility, owns spans and logs
  layer.ts        composition; internals must not leak into requirements
```

- One repository per table. A repository owning two tables needs a reason
  (a channel move must write its audit event, so they share one).
- Services take `Actor` first, carry one `Effect.withSpan("Service.method")`,
  and annotate logs with `orgId`.
- `layer.ts` provides repositories and id generation beneath the services, so
  callers only supply `Database` and `Cache`.

## HTTP API

- One group per surface in `@anpord/schema/*-api.ts`; composed in `api.ts`.
- One handler file per group in `apps/server/src/routes/`.
- Auth via the `Authentication` middleware — never read headers in a handler.
- Adding a surface: new group file, add to `api.ts`, new handler file, add to
  `routes/api-layer.ts`. Nothing else changes.

## Cache

- Never load-bearing. A Redis failure logs and degrades to a store read.
- `get`/`set` take a `Schema`; payloads are decoded, never cast.
- Keys come from the owning package's `domain/keys.ts`. Every key for one
  entity shares a prefix so a write invalidates all of them.
- `REDIS_URL` unset → a no-op cache, so local dev works without Redis.

## Validation

```bash
bun run check      # biome / ultracite
bun run typecheck
bun run test
bun run knip       # unused files, deps, exports
```

All four must pass. `bun run doctor` for React changes.
