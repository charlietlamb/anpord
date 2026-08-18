# @anpord/e2e

End-to-end scenarios that drive the API, the SDK, and the CLI against a real
server and a real database.

```bash
bun run e2e           # run everything
bun run e2e -- --stop # run everything, then stop the test cluster
```

## What a run does

1. Starts a Postgres cluster on port 55433, owned by these tests. Your own
   Postgres keeps its port, its data, and its version.
2. Drops and recreates `anpord_e2e`, then applies the real migrations, so a run
   also proves the journal applies cleanly from nothing.
3. Seeds two organizations. The second exists so tenant isolation is something a
   scenario can actually check rather than assume.
4. Starts the server binary, so routing, authentication, and encoding are
   exercised exactly as a deployment would.
5. Mints API keys through the same endpoint the dashboard calls, and keeps the
   plaintext in `.e2e/api-keys.json`.
6. Runs every scenario, reporting each one and continuing past failures so a
   single run covers the whole surface.

The cluster is left running afterwards. The preserved key points at it, so you
can keep poking at whatever the scenarios just built. The server exits with the
run, so start one against the test database first:

```bash
cd ../server && DATABASE_URL=postgresql://postgres@127.0.0.1:55433/anpord_e2e \
  BETTER_AUTH_SECRET=e2e-secret-that-is-at-least-32-characters-long \
  PORT=3099 bun run src/server.ts
```

Then, from this directory:

```bash
export ANPORD_API_KEY=$(node -p "require('./.e2e/api-keys.json').keys['e2e-writer'].key")
export ANPORD_BASE_URL=http://127.0.0.1:3099
bun run ../../packages/sdk/src/cli/main.ts list
```

## Preserved keys

A key is shown once and never again, so the plaintext is stored rather than
re-minted per run. Before reuse it is checked against the running server: a
reset database leaves the file pointing at an organization that no longer
exists, and a stale key is replaced rather than trusted.

## Adding a scenario

Scenarios are plain objects with a `name` and a `run`, grouped by the surface
they exercise. `run` receives the `World`: base url, both tenants, both keys, a
scratch directory, and a `query` for asserting against the database rather than
only against the response.

Keep a scenario's fixtures its own. Depending on what an earlier scenario left
behind turns one failure into a cascade of them.
