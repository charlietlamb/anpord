FROM oven/bun:1.3.14-alpine AS build

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile --ignore-scripts
RUN cd apps/mcp && bun run bundle

FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build /app/apps/mcp/dist ./
RUN npm install --omit=dev --no-audit --no-fund

EXPOSE 3000

CMD ["node", "main.js"]
