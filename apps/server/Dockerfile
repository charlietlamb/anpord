# Built from the repo root so the workspace packages the server depends on are
# in context: docker build -f apps/server/Dockerfile .
FROM oven/bun:1.3.14-alpine AS install

WORKDIR /app

# Manifests first, so a dependency install is only redone when one of them
# changes rather than on every source edit. Every workspace manifest is copied,
# including ones the server does not use: the lockfile describes the whole
# workspace, so a missing member reads as a changed lockfile and fails frozen.
COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/auth/package.json ./packages/auth/
COPY packages/cache/package.json ./packages/cache/
COPY packages/db/package.json ./packages/db/
COPY packages/ids/package.json ./packages/ids/
COPY packages/prompts/package.json ./packages/prompts/
COPY packages/schema/package.json ./packages/schema/
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
COPY --from=install /app/packages/cache/node_modules ./packages/cache/node_modules
COPY --from=install /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=install /app/packages/ids/node_modules ./packages/ids/node_modules
COPY --from=install /app/packages/prompts/node_modules ./packages/prompts/node_modules
COPY --from=install /app/packages/schema/node_modules ./packages/schema/node_modules

# App Runner routes to the container's published port, so the server has to
# bind every interface rather than loopback.
ENV HOST=0.0.0.0
ENV PORT=3003
EXPOSE 3003

USER bun

CMD ["bun", "run", "apps/server/src/server.ts"]
