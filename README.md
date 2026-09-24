# Anpord

Anpord runs coding agent evals. A suite holds cases, each case runs on variants (a harness, model and sandbox), and a batch starts those runs together so variants can be compared. Every run records its trials, command trajectories and pass rate.

## Repository

This is a Bun and Turbo TypeScript monorepo containing:

- the TanStack Start dashboard
- the Effect HTTP API
- the `anpord` TypeScript SDK and CLI
- the hosted MCP server
- the eval runtime and sandbox adapters
- Product documentation

## Setup

```sh
bun install
cp .env.example .env
bun run db:migrate
bun dev
```

The dashboard runs at `http://localhost:3005`, the API at `http://127.0.0.1:3003`, and the docs preview at `http://localhost:3007`.

See [.env.example](./.env.example) for database, authentication, harness, model, and sandbox credentials.

## Commands

```sh
bun run docs
bun run openapi
bun run check
bun run typecheck
bun run test
bun run knip
bun run doctor
```

The pre-commit hook runs the repository checks.
