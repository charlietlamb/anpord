---
name: sphynx-map
description: Where everything lives in sphynx. Real packages, apps, ports, paths for each cross-package rule, deviations from the default architecture, gate commands, and how to run an eval against the local stack. Read before adding a package, service, endpoint, table, or id in sphynx, and before running the CLI locally. The rules themselves live in repo-map.
---

# Sphynx map

The rules are in `~/.agents/skills/repo-map/SKILL.md`. This file only says where they live in sphynx and where sphynx differs. When the two disagree, this file wins.

## Packages

| Package | Owns | Depends on |
|---|---|---|
| `@sphynx/schema` | Wire contracts, branded types, HTTP API groups, transport errors | nothing |
| `@sphynx/ids` | Prefixed id generation | nothing |
| `@sphynx/template` | Prompt template syntax, extraction, rendering | nothing |
| `@sphynx/db` | Drizzle schema, pool, migrations | `schema` |
| `@sphynx/cache` | Redis behind a `Cache` tag, no-op fallback | nothing |
| `@sphynx/billing` | Autumn billing | nothing |
| `@sphynx/notifications` | Email | nothing |
| `@sphynx/auth` | Better Auth, sessions, OAuth, organizations, credentials | `billing`, `db`, `ids`, `notifications`, `schema` |
| `@sphynx/prompts` | Prompt domain | `cache`, `db`, `ids`, `schema` |
| `@sphynx/eval` | Eval domain: batches, trials, judges, codebases, sandbox adapters | `db`, `ids`, `schema` |
| `@sphynx/ui` | Shared React components | `schema`, `template` |
| `sphynx-sh` (`packages/sdk`) | Published client, CLI, and MCP | `eval`, `schema`, `template` |

## Apps

| App | What | Dev |
|---|---|---|
| `apps/server` | Effect HTTP server, layer composition | port 3003, `bun --watch run src/server.ts` |
| `apps/web` | TanStack Start frontend | port 3005, `vite dev` |
| `apps/mcp` | MCP server (`mcp-use`) | port 3010 |
| `apps/worker` | Trigger.dev tasks | `trigger dev --profile sphynx` |
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
| Error mappers | `apps/server/src/http/<domain>-errors.ts`, each exporting `with<Domain>Errors` and switching on `_tag` with `satisfies never` |
| Shared eval route helpers | `apps/server/src/routes/evals/` (`batch-actions`, `batch-reads`, `catalog-reads`, `run-reads`), called by both API sides |
| Scratch test database | `@sphynx/db/test-database` (`skipWithoutDatabase`, `testDatabase`) |
| Store query helpers | `@sphynx/db/query` (`Db`, `Tx`, `head`, `tryStoreWith`), `@sphynx/db/like` |
| Cache keys | `packages/prompts/src/domain/keys.ts` |

## Deviations

- Two APIs, not one. `SphynxApi` in `packages/schema/src/internal/api.ts` serves the dashboard. `PublicApi` in `packages/schema/src/public/api.ts` serves the SDK and `/v1`. Groups are `<surface>-api.ts` in the matching folder.
- Handlers live at `apps/server/src/routes/<internal|public>/<surface>/handlers.ts`, except `public/evals/`, which has one `<resource>-handlers.ts` per group. Each side composes its handlers in its own `api-layer.ts`. Adding a surface touches the group file, that side's `api.ts`, a new `handlers.ts`, and that side's `api-layer.ts`.
- `packages/eval` uses `ports/` and `adapters/` (harness, models, runner, sandbox, scorers, simulated user) on top of the default domain layout.
- Only `prompts` caches today. `eval` has no `domain/keys.ts`.

## Configuration

One module owns each concern. Import it; never repeat the literal.

| Concern | Module |
|---|---|
| Production origins (API, web, docs, API reference) | `@sphynx/schema/public/origins` |
| Local dev ports and their default URLs (3003, 3005, 3010) | `@sphynx/schema/internal/local-ports` |
| Session cookie name and prefix | `@sphynx/schema/internal/authentication` |
| Env names the eval writes and the SDK sandbox runtime reads | `@sphynx/schema/domain/sandbox-env` |
| Mock journal paths | `@sphynx/schema/domain/api-mocks` |
| Permissions an API key or OAuth token may carry | `API_SCOPES` in `@sphynx/schema/domain/scopes` |
| Eval source size cap | `SOURCE_LIMIT` in `@sphynx/schema/domain/eval-source-files` |
| Case sort and order | `CaseSort`, `CaseOrder` in `@sphynx/schema/domain/eval-read-models` |
| Eval-run task id and payload | `@sphynx/eval/adapters/runner/eval-run-task` |

Environment is read through Effect `Config` in the module that owns it:

| Package | Module | Reads |
|---|---|---|
| `db` | `src/config.ts` | `DATABASE_URL`, `DATABASE_POOL_MAX`, `DATABASE_STATEMENT_TIMEOUT` |
| `cache` | `src/config.ts` | `REDIS_URL`, `CACHE_TTL_SECONDS` |
| `auth` | `src/config/auth-config.ts`, `github-credentials.ts` | `BETTER_AUTH_*`, `AUTH_TRUSTED_ORIGINS`, `MCP_RESOURCE_URL`, `GITHUB_CLIENT_*` |
| `billing` | `src/config.ts` | `AUTUMN_*` |
| `notifications` | `src/email/email-config.ts` | `RESEND_API_KEY`, `EMAIL_FROM` |
| `eval` | `services/harness-versions.ts`, `services/sandbox-provider.ts`, `services/journal-retention.ts`, `telemetry.ts`, `adapters/runner/trigger.ts`, `adapters/sandbox/*`, `codebase/github-app.ts`, `credentials/cipher.ts` | harness versions, sandbox concurrency and keys, `EVAL_JOURNAL_HOT`, `AXIOM_*`, `TRIGGER_SECRET_KEY`, `GITHUB_APP_*`, `CREDENTIALS_ENCRYPTION_KEY` |
| `sdk` | `src/client/config.ts`, `src/cli/*` | `SPHYNX_API_KEY`, `SPHYNX_BASE_URL`, `SPHYNX_WEB_URL`, `SPHYNX_BROWSER`, GitHub Actions context |
| `apps/server` | `src/config.ts`, `routes/internal/health/handlers.ts`, `http/authentication/session-authentication.ts` | `HOST`, `PORT`, `SHUTDOWN_DRAIN_TIMEOUT`, `BUILD_REVISION`, `ROLE_CACHE_CAPACITY` |
| `apps/mcp` | `src/config.ts` | `SPHYNX_AUTH_URL`, `SPHYNX_BASE_URL`, `PORT`, `MCP_RESOURCE_URL` |

Raw `process.env` stays only where Effect is not running:

- `apps/web`: `import.meta.env` is Vite's build-time replacement, and `lib/server/server-url.ts` runs in Nitro.
- `packages/db/src/migrations/target.ts` and `scripts/*.ts` are CLIs that run before any layer.
- `packages/sdk/src/evals/validator-runtime.ts` and `runner-source.ts` run inside the sandbox; they take the names from `sandbox-env`.
- `packages/eval/src/credentials/env-resolver.ts` and `packages/sdk/src/cli/local-env.ts` enumerate the whole environment, which `Config` cannot.
- `packages/sdk/src/cli/transcript-writer.ts` checks `NO_COLOR` in a pure formatter.
- `@sphynx/db/test-database` and test setup, and `apps/e2e`, which writes env for the processes it starts.

The ports and origins also appear where TypeScript cannot import them: root `package.json` scripts, `scripts/*.sh`, `.github/workflows/*`, and `turbo.json`. Change them together.

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
- It mints against the organization the browser is signed into, so the batch it opens is one you can see. `SPHYNX_TEST_ORG` names another, created if missing.
- `bun run test-org` creates an organization on its own. It refuses any database that isn't localhost, because it writes an unverified user.
- `SPHYNX_BROWSER` picks the browser. `none` prints the address and opens nothing, which is what automated runs want.
- `scripts/fixtures/local-smoke` is a keyless suite on the `command` harness. It needs no model credential and settles in under a second, so it's the fastest end-to-end proof.

## Local setup

- Env comes from `.env.local` then `.env`. `.env.local` overrides, so a missing local value falls through to `.env`, not to prod.
- `bun run mint-key --org <slug>` mints an API key for an organization you own, without clicking through the dashboard.
