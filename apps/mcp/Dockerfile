FROM oven/bun:1.3.14-alpine AS install

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/mcp/package.json ./apps/mcp/
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

RUN bun install --frozen-lockfile --ignore-scripts

FROM oven/bun:1.3.14-alpine AS release

WORKDIR /app

ENV NODE_ENV=production

COPY package.json bun.lock tsconfig.json ./
COPY apps/mcp ./apps/mcp
COPY packages/schema ./packages/schema
COPY packages/sdk ./packages/sdk

COPY --from=install /app/node_modules ./node_modules
COPY --from=install /app/apps/mcp/node_modules ./apps/mcp/node_modules
COPY --from=install /app/packages/schema/node_modules ./packages/schema/node_modules
COPY --from=install /app/packages/sdk/node_modules ./packages/sdk/node_modules

# The MCP imports the SDK's built entry, so only that package is built.
RUN cd packages/sdk && bun run build

ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["bun", "run", "apps/mcp/src/main.ts"]
