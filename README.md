# Anpord

Bun TypeScript monorepo bootstrapped from Sphynx's final Neon/Postgres architecture before its Convex migration.

## Stack

- Turbo and Bun workspaces
- TanStack Start, React 19, Vite, and Tailwind CSS 4
- Effect HTTP server on Bun
- Better Auth with GitHub OAuth, magic links, and organizations
- Neon Postgres, Drizzle ORM, and Drizzle Kit
- Shared Effect schemas and UI package
- Ultracite/Biome, knip, and React Doctor enforced on pre-commit

## Setup

```sh
bun install
cp .env.example .env
# Set DATABASE_URL to a Neon connection string
bun run db:migrate
bun dev
```

The web app runs on `http://localhost:3005` and the API server on `http://127.0.0.1:3003`.

## Auth

Sign-in offers GitHub OAuth and email magic links. Both post to the API server,
which the web app reaches through the `/api/auth/*` proxy route.

Magic links are delivered with Resend. Leave `RESEND_API_KEY` unset in
development and the link is written to the server log instead of being emailed,
so the flow works without an API key.

| Variable | Purpose |
| --- | --- |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Enables the GitHub button when both are set |
| `RESEND_API_KEY` / `EMAIL_FROM` | Enables real magic-link delivery |
| `AUTH_TRUSTED_ORIGINS` | Comma-separated origins allowed to call the auth API |
| `WEB_URL` | Origin the web app is served from |

## Checks

`bun run check` (lint), `bun run typecheck`, `bun run knip` (dead code),
`bun run doctor` (React), and `bun run test`. The pre-commit hook runs all of
them.
