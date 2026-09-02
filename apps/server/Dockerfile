# Built from the repo root so the workspace packages the server depends on are
# in context: docker build -f apps/server/Dockerfile .
FROM oven/bun:1.3.14-alpine AS install

WORKDIR /app

# Manifests first, so a dependency install is only redone when one of them
# changes rather than on every source edit. Every workspace manifest is copied,
# including ones the server does not use: the lockfile describes the whole
# workspace, so a missing member reads as a changed lockfile and fails frozen.
COPY package.json bun.lock ./
COPY apps/docs/package.json ./apps/docs/
COPY apps/e2e/package.json ./apps/e2e/
COPY apps/mcp/package.json ./apps/mcp/
COPY apps/sandbox-bridge/package.json ./apps/sandbox-bridge/
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY packages/auth/package.json ./packages/auth/
COPY packages/billing/package.json ./packages/billing/
COPY packages/cache/package.json ./packages/cache/
COPY packages/db/package.json ./packages/db/
COPY packages/eval/package.json ./packages/eval/
COPY packages/ids/package.json ./packages/ids/
COPY packages/notifications/package.json ./packages/notifications/
COPY packages/prompts/package.json ./packages/prompts/
COPY packages/schema/package.json ./packages/schema/
COPY packages/template/package.json ./packages/template/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/ui/package.json ./packages/ui/

# Not --production: the root manifest holds only devDependencies, so that flag
# resolves to installing nothing and the workspace members get no packages.
# --ignore-scripts because the root prepare script installs husky's git hooks,
# which is a developer-machine concern and fails without the dev dependency.
RUN bun install --frozen-lockfile --ignore-scripts

FROM oven/bun:1.3.14-alpine AS release

WORKDIR /app

ENV NODE_ENV=production

# Source first, then the installed trees on top: bun resolves per workspace
# member rather than hoisting everything, so packages/*/node_modules carries
# most of the real dependencies and would be masked by a later source copy.
COPY package.json bun.lock ./
COPY apps/server ./apps/server
COPY packages ./packages

COPY --from=install /app/node_modules ./node_modules
COPY --from=install /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=install /app/packages/auth/node_modules ./packages/auth/node_modules
COPY --from=install /app/packages/billing/node_modules ./packages/billing/node_modules
COPY --from=install /app/packages/cache/node_modules ./packages/cache/node_modules
COPY --from=install /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=install /app/packages/eval/node_modules ./packages/eval/node_modules
COPY --from=install /app/packages/ids/node_modules ./packages/ids/node_modules
COPY --from=install /app/packages/notifications/node_modules ./packages/notifications/node_modules
COPY --from=install /app/packages/prompts/node_modules ./packages/prompts/node_modules
COPY --from=install /app/packages/schema/node_modules ./packages/schema/node_modules

# App Runner routes to the container's published port, so the server has to
# bind every interface rather than loopback.
ENV HOST=0.0.0.0
ENV PORT=3003
EXPOSE 3003

USER bun

CMD ["bun", "run", "apps/server/src/server.ts"]
