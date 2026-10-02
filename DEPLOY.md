# Deploy

Two pieces, deployed separately:

- **`apps/web`** — TanStack Start, on Vercel, serving `sphynx.sh`
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

**The environment variables**, set on the service.

The five marked *secret* are stored in Secrets Manager under `sphynx/server/<NAME>`
and referenced by the service as `RuntimeEnvironmentSecrets`, so their values never
appear in the service configuration. Reading them needs the instance role
`AppRunnerSphynxInstanceRole`, whose inline policy grants
`secretsmanager:GetSecretValue` on `sphynx/server/*` and nothing else. Rotate one
with `aws secretsmanager put-secret-value --secret-id sphynx/server/<NAME>`; the
service picks it up on its next deployment.

Rotating `BETTER_AUTH_SECRET` additionally invalidates every session, and the
`jwks` row holds a key encrypted with it — delete that row after rotating so
Better Auth generates a fresh one, or MCP token signing breaks.

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | *secret*. Neon. Include `?sslmode=verify-full` |
| `REDIS_URL` | *secret*. Upstash TCP endpoint, unquoted |
| `BETTER_AUTH_SECRET` | *secret*. 48 random bytes, base64url |
| `BETTER_AUTH_URL` | The App Runner URL, once known |
| `WEB_URL` | `https://sphynx.sh` |
| `AUTH_TRUSTED_ORIGINS` | `https://sphynx.sh` |
| `GITHUB_CLIENT_ID` | |
| `GITHUB_CLIENT_SECRET` | *secret* |
| `MCP_RESOURCE_URL` | `https://mcp.sphynx.sh/mcp`. Set by the deploy workflow from the `MCP_RESOURCE_URL` repository variable, so it only needs setting here to change it. Without it the auth server issues tokens for `http://localhost:3010/mcp` and the MCP client rejects them |
| `RESEND_API_KEY` | *secret* |
| `AXIOM_TOKEN` | *secret*. Optional: without it the server runs without telemetry. Needs ingest permission on the dataset |
| `AXIOM_DATASET` | Defaults to `sphynx`. The dataset must already exist; ingest does not create one |
| `EMAIL_FROM` | |
| `GITHUB_APP_ID` | The app's numeric id. Without it, and the two below, the codebase settings answer "No GitHub app is registered for this deployment" and evals clone public repositories only |
| `GITHUB_APP_SLUG` | `sphynx`, which addresses its install page |
| `DAYTONA_API_KEY` | *secret*. The sandbox an organisation gets when it has connected none of its own. Without it such a run fails, because the fallback adapter has no account to build itself from |
| `E2B_API_KEY` | *secret*. Same, for E2B |
| `TRIGGER_SECRET_KEY` | *secret*. Required to start the server and dispatch runs. Use the production environment key (`tr_prod_*`), not the deployment access token. `TRIGGER_API_KEY` is also accepted |
| `VERCEL_TOKEN` | *secret*. Same, for Vercel Sandbox, which also needs the two below |
| `VERCEL_TEAM_ID` | Identifier rather than a secret |
| `VERCEL_PROJECT_ID` | Identifier rather than a secret |
| `EVAL_JOURNAL_HOT` | Defaults to `30 days`. How long a settled trial keeps one row per event before the journal is folded into one; the run page reads either |
| `AUTUMN_API_KEY` | *secret*. Without it usage goes uncounted, since the meter fails open |
| `GITHUB_APP_PRIVATE_KEY` | *secret*. The `.pem` GitHub issued, whole. `./scripts/configure-github-app.sh` puts all three on the service |
| `SHUTDOWN_DRAIN_TIMEOUT` | Defaults to `20 seconds`. How long a stopping instance waits for requests already running before it exits. Keep it under the platform's stop grace period |
| `HOST` | `0.0.0.0` — already set in the image |
| `PORT` | `3003` — already set in the image |

The service runs 0.5 vCPU / 1 GB with at least 2 instances (up to 4, 80 requests
each) and a health check on `/api/livez` every 5 seconds, replaced after 3
misses. `scripts/apprunner-shape.sh` holds this shape: `apply` sets it with operator
credentials, and the deploy workflow runs `check` first and refuses to deploy a
service that has drifted, naming what changed. The CI key (`sphynx-ci`) may read
the service and its scaling config and start deployments, but not update the
service, so it cannot resize production. The same holds for the workflow's
`MCP_RESOURCE_URL` step: when that variable changes, set it on the service with
operator credentials before deploying. The server idles near 400 MB and has peaked near 500 MB while evals
run; on a single 0.5 GB instance that meant 8 kills with exit code 137 in a week,
each taking the API down until it restarted. 1 GB leaves twice the worst seen,
and a second instance keeps serving while one is replaced.
The platform check is `/api/livez`, which answers 200 while the process runs.
It deliberately ignores the database: `/api/healthz` fails when Postgres is
unreachable, and as the platform check a short Neon outage would make App Runner
replace every instance at once. The deploy workflow still waits for
`/api/healthz` to report the new revision before it succeeds.

The server opens its port only after both APIs have mounted their routes, so a
new instance refuses connections until it can answer every route rather than
accepting traffic it cannot route. On `SIGTERM` it stops accepting connections,
lets requests already running finish, then exits.

The deployment workflow checks for the Trigger key before building. Store it in
Secrets Manager and reference its ARN as `TRIGGER_SECRET_KEY` in App Runner;
keep the existing environment and secret references intact. Health responses
include the image's `revision`, which must match the deployed commit before the
workflow succeeds. `RUNNING` alone can also mean the previous image survived a
failed rollout.

Re-running the script after the service exists is an ordinary deploy.

## 2. Web → Vercel

```bash
cd apps/web
vercel link            # scope charlietlamb, project sphynx
vercel env add BETTER_AUTH_URL production   # the App Runner URL
vercel env add AUTH_SERVER_URL production   # same value
vercel --prod
```

Then point `sphynx.sh` at the project under the domain settings.

## 3. After both are up

`BETTER_AUTH_URL` on the server initially points at the App Runner URL. Once
the domain resolves, GitHub OAuth needs its callback updated to
`https://<app-runner-url>/api/auth/callback/github`, otherwise sign-in fails
with a redirect mismatch.

## Worker → Trigger.dev

`apps/worker` runs trials. It is deployed by `deploy-worker.yml` with
`bunx trigger.dev deploy`; its environment is set in the Trigger dashboard,
not by the workflow. It reads the same `DATABASE_URL`, provider keys, and
`EVAL_*_CONCURRENCY` variables the server does.

Two of them size a run. Each `eval-run` task holds every sandbox of its run
from one container, and the per-provider concurrency caps how many are live at
once; the pool has to keep up with the journal each one writes.

| Variable | Worker value | Why |
| --- | --- | --- |
| `EVAL_DAYTONA_CONCURRENCY`, `EVAL_E2B_CONCURRENCY` | `50` | The code default is 5 so a laptop does not open fifty sandboxes by accident. A run of fifty trials in one wave needs the cap raised here. |
| `DATABASE_POOL_MAX` | `24` | Fifty trials append their journals in batches of up to 32 events every 400ms. Eight connections, the default, starve the appends and the trials settle void with `journal` named. `DATABASE_URL` must be the pooled Neon endpoint, so concurrent runs multiply client connections against the pooler rather than the compute. |
| `EVAL_JOURNAL_HOT` | unset | Retention runs in the server, not here. |

## Cost

Two provisioned 1 GB instances cost about $10/month idle, the same as one
2 GB instance (App Runner bills provisioned memory whether or not requests
arrive), plus vCPU time only while requests are running. ECR storage is pennies with the lifecycle
policy the script applies. Vercel's hobby tier covers the frontend.

To stop paying for the server, pause the App Runner service; that keeps the
configuration and stops compute billing.

## MCP server → Manufact

The MCP server exposes the public API as tools. It is bundled into a single
file before deploying, because Manufact generates its own Dockerfile for
managed uploads and its `npm install` cannot resolve `workspace:*`.

```bash
cd apps/mcp && bun run bundle    # writes dist/main.js + a deployable manifest
cd dist && mcp-use deploy . --no-github --name sphynx-mcp --env-file .env.deploy
```

`.env.deploy` needs `SPHYNX_API_KEY` and `SPHYNX_BASE_URL`. Both are ignored by
git; the key is an `anp_` key minted against the organization the server should
act for.

Live at `https://mcp.sphynx.sh/mcp`. The generated `*.run.mcp-use.com` slug
stops routing once the custom domain verifies, so the domain is the only URL a
client should be given.

Tokens are opaque, so the server resolves each one at the authorization server
rather than verifying a signature. It also has to hand the SDK the resource the
token was issued for; without that binding every authenticated call is refused
and the connector lists no tools.

## CLI

Published as the `sphynx` binary from `packages/sdk`. It reads `SPHYNX_API_KEY`
and optionally `SPHYNX_BASE_URL`.

```bash
sphynx list
sphynx get support-reply              # content on stdout, so > file works
sphynx get support-reply --at 3       # not --version: the CLI owns that flag
sphynx push support-reply - -m "why"  # - reads stdin
sphynx promote support-reply --to production --at 3
```

## Verifying a deploy

```bash
bun run e2e                                    # against localhost
API=https://api.sphynx.sh MCP=https://mcp.sphynx.sh bun run e2e
```

Checks discovery metadata, that unauthenticated calls are refused with a
`WWW-Authenticate` challenge, that the MCP server demands OAuth, and — when
`SPHYNX_API_KEY` is set — that authenticated reads and their error codes work.
Everything it does is safe against production.
