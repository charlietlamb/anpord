# Deploy

Two pieces, deployed separately:

- **`apps/web`** — TanStack Start, on Vercel, serving `anpord.com`
- **`apps/server`** — long-running Bun process, on AWS App Runner

They are split because the server holds a Postgres pool and a persistent Redis
(TCP, via ioredis) connection. Neither survives a serverless function's
lifecycle, so the server needs a container that stays up.

The web app reaches the server through `BETTER_AUTH_URL`, so the server has to
exist before the frontend is useful. Deploy in that order.

## 1. Server → App Runner

```bash
aws login                     # opens a browser; must run in your own shell
./scripts/deploy-server.sh    # builds, pushes to ECR, deploys
```

The first run creates the ECR repository and pushes the image, then stops and
tells you to create the service. That step is once-only and needs two things
the script deliberately does not create on your behalf:

**An access role**, so App Runner may pull from ECR. In the console this is
offered as "Create new service role" when you pick a private ECR image.

**The environment variables**, set on the service:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon. Include `?sslmode=require` |
| `REDIS_URL` | Upstash TCP endpoint, unquoted |
| `BETTER_AUTH_SECRET` | |
| `BETTER_AUTH_URL` | The App Runner URL, once known |
| `WEB_URL` | `https://anpord.com` |
| `AUTH_TRUSTED_ORIGINS` | `https://anpord.com` |
| `GITHUB_CLIENT_ID` | |
| `GITHUB_CLIENT_SECRET` | |
| `RESEND_API_KEY` | |
| `EMAIL_FROM` | |
| `HOST` | `0.0.0.0` — already set in the image |
| `PORT` | `3003` — already set in the image |

Suggested size is 0.25 vCPU / 0.5 GB, which is the floor and enough for this
workload. Set the health check path to `/api/healthz`, which answers 200.
App Runner counts only 2xx as healthy, so an authenticated route returning 401
fails the check even though the server is up.

Re-running the script after the service exists is an ordinary deploy.

## 2. Web → Vercel

```bash
cd apps/web
vercel link            # scope charlietlamb, project anpord
vercel env add BETTER_AUTH_URL production   # the App Runner URL
vercel env add AUTH_SERVER_URL production   # same value
vercel --prod
```

Then point `anpord.com` at the project under the domain settings.

## 3. After both are up

`BETTER_AUTH_URL` on the server initially points at the App Runner URL. Once
the domain resolves, GitHub OAuth needs its callback updated to
`https://<app-runner-url>/api/auth/callback/github`, otherwise sign-in fails
with a redirect mismatch.

## Cost

App Runner at the minimum size is roughly $5–10/month, billed for provisioned
memory whether or not requests arrive. ECR storage is pennies with the lifecycle
policy the script applies. Vercel's hobby tier covers the frontend.

To stop paying for the server, pause the App Runner service; that keeps the
configuration and stops compute billing.

## MCP server → Manufact

The MCP server exposes the public API as tools. It is bundled into a single
file before deploying, because Manufact generates its own Dockerfile for
managed uploads and its `npm install` cannot resolve `workspace:*`.

```bash
cd apps/mcp && bun run bundle    # writes dist/main.js + a deployable manifest
cd dist && mcp-use deploy . --no-github --name anpord-mcp --env-file .env.deploy
```

`.env.deploy` needs `ANPORD_API_KEY` and `ANPORD_BASE_URL`. Both are ignored by
git; the key is an `anp_` key minted against the organization the server should
act for.

Live at `https://wild-wave-dxlyk.run.mcp-use.com/mcp`.

## CLI

Published as the `anpord` binary from `packages/sdk`. It reads `ANPORD_API_KEY`
and optionally `ANPORD_BASE_URL`.

```bash
anpord list
anpord get support-reply              # content on stdout, so > file works
anpord get support-reply --at 3       # not --version: the CLI owns that flag
anpord push support-reply - -m "why"  # - reads stdin
anpord promote support-reply --to production --at 3
```
