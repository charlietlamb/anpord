---
name: anpord-map
description: Where everything lives in anpord. Real packages, apps, ports, paths for each cross-package rule, deviations from the default architecture, gate commands, and how to run an eval against the local stack. Read before adding a package, service, endpoint, table, or id in anpord, and before running the CLI locally. The rules themselves live in repo-map.
---

# Anpord map

The rules are in `~/.agents/skills/repo-map/SKILL.md`. This file only says where they live in anpord and where anpord differs. When the two disagree, this file wins.

## Packages

| Package | Owns | Depends on |
|---|---|---|
| `@anpord/schema` | Wire contracts, branded types, HTTP API groups, transport errors | nothing |
| `@anpord/ids` | Prefixed id generation | nothing |
| `@anpord/template` | Prompt template syntax, extraction, rendering | nothing |
| `@anpord/db` | Drizzle schema, pool, migrations | `schema` |
| `@anpord/cache` | Redis behind a `Cache` tag, no-op fallback | nothing |
| `@anpord/billing` | Autumn billing | nothing |
| `@anpord/notifications` | Email | nothing |
| `@anpord/auth` | Better Auth, sessions, OAuth, organizations, credentials | `billing`, `db`, `ids`, `notifications`, `schema` |
| `@anpord/prompts` | Prompt domain | `cache`, `db`, `ids`, `schema` |
| `@anpord/eval` | Eval domain: batches, trials, judges, codebases, sandbox adapters | `db`, `ids`, `schema` |
| `@anpord/ui` | Shared React components | `schema`, `template` |
| `anpord` (`packages/sdk`) | Published client, CLI, and MCP | `eval`, `schema`, `template` |

## Apps

| App | What | Dev |
|---|---|---|
| `apps/server` | Effect HTTP server, layer composition | port 3003, `bun --watch run src/server.ts` |
| `apps/web` | TanStack Start frontend | port 3005, `vite dev` |
| `apps/mcp` | MCP server (`mcp-use`) | port 3010 |
| `apps/worker` | Trigger.dev tasks | `trigger dev --profile anpord` |
| `apps/sandbox-bridge` | Cloudflare Worker exposing Cloudflare Sandbox to evals | `wrangler` |
| `apps/e2e` | Scenarios driving the API, SDK, and CLI against a real server and database | `bun run e2e` |
| `apps/docs` | Mintlify docs | `bun run docs` |

`bun run dev` starts everything through Turbo. `bun run dev:kill` frees 3003 and 3005.

## Where the rules live

| Rule | Path |
|---|---|
| `Actor` | `packages/schema/src/domain/actor.ts` |
| Actor decoded from a credential | `apps/server/src/http/authentication/` (session, API key, OAuth token, see its README) |
| `CurrentActor` read for authorization | `apps/server/src/http/authorization/authorized-group.ts` |
| Id prefixes | `packages/ids/src/prefixes.ts` |
| Transport errors | `packages/schema/src/domain/errors.ts` |
| Error mappers | `apps/server/src/http/<domain>-errors.ts`, each exporting `with<Domain>Errors` |
| Cache keys | `packages/prompts/src/domain/keys.ts` |

## Deviations

- Two APIs, not one. `AnpordApi` in `packages/schema/src/internal/api.ts` serves the dashboard. `PublicApi` in `packages/schema/src/public/api.ts` serves the SDK and `/v1`. Groups are `<surface>-api.ts` in the matching folder.
- Handlers live at `apps/server/src/routes/<internal|public>/<surface>/handlers.ts`. Each side composes its handlers in its own `api-layer.ts`. Adding a surface touches the group file, that side's `api.ts`, a new `handlers.ts`, and that side's `api-layer.ts`.
- `packages/eval` uses `ports/` and `adapters/` (harness, models, runner, sandbox, scorers, simulated user) on top of the default domain layout.
- Only `prompts` caches today. `eval` has no `domain/keys.ts`.

## Commands

```bash
bun run check           # ultracite, then db:check
bun run typecheck
bun run test
bun run knip
bun run check:comments  # pre-commit, caps a comment block at three lines
bun run doctor          # React changes
```

Database commands run from the repository root. Each picks `DATABASE_URL`, then `.env.local`, then `.env`, and prints the database before touching it. `packages/db/README.md` has the details.

```bash
bun run db:generate --name <what_changed>  # drizzle-kit generate, with the new entry dated after the last
bun run db:status                          # read only: target, applied, pending, and each refusal with its fix; exits 1 if migrate would refuse
bun run db:migrate --dry-run               # read only: pending SQL files and their data loss
bun run db:migrate                         # one transaction; refuses a pushed or mismatched database, and data loss
bun run db:migrate --record <tag>          # mark migrations up to <tag> applied without running them (a pushed database)
bun run db:migrate --confirm-data-loss     # apply a migration that drops or deletes, after a pg_dump backup
bun run db:reset                           # localhost only: drop, recreate, migrate; --yes when the database exists
bun run db:check                           # journal order, and data loss missing from drizzle/data-loss.json
```

Never run `drizzle-kit migrate` or `drizzle-kit push` directly. Read the SQL `db:generate` prints before migrating. Ask the owner before `--confirm-data-loss` or `db:reset --yes` on a database that holds their data.

## Running an eval locally

`--ui` opens the dashboard for the batch, so it needs a key and an organization. One command sets both up:

```bash
eval "$(bun run local:key)"
bun packages/sdk/dist/bin.cjs eval <file> --local --ui
```

- The server must be running (`bun run dev`). The key comes from the endpoint the dashboard calls, not from the table.
- It mints against the organization the browser is signed into, so the batch it opens is one you can see. `ANPORD_TEST_ORG` names another, created if missing.
- `bun run test-org` creates an organization on its own. It refuses any database that isn't localhost, because it writes an unverified user.
- `ANPORD_BROWSER` picks the browser. `none` prints the address and opens nothing, which is what automated runs want.
- `scripts/fixtures/local-smoke` is a keyless suite on the `command` harness. It needs no model credential and settles in under a second, so it's the fastest end-to-end proof.

## Local setup

- Env comes from `.env.local` then `.env`. `.env.local` overrides, so a missing local value falls through to `.env`, not to prod.
- `bun run mint-key --org <slug>` mints an API key for an organization you own, without clicking through the dashboard.
