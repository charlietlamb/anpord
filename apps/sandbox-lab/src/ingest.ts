import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface SandboxEvent {
  readonly at: string;
  readonly data: Record<string, unknown>;
  readonly kind: string;
  readonly seq: number;
  readonly sessionId: string;
}

const PORT = Number(process.env.PORT ?? 4500);
const STORE = process.env.STORE ?? "./.sessions";

mkdirSync(STORE, { recursive: true });

const pathFor = (sessionId: string) =>
  join(STORE, `${sessionId.replace(/[^\w.-]/g, "_")}.ndjson`);

/**
 * Stands in for the hosted endpoint. It does the one thing that matters for
 * the experiment: keep every event, keyed by session, so a run can be read
 * back after the sandbox it came from is gone.
 */
const server = Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/sandbox") {
      const body = await request.text();
      const lines = body.split("\n").filter((line) => line.trim().length > 0);
      let stored = 0;

      for (const line of lines) {
        try {
          const event = JSON.parse(line) as SandboxEvent;
          appendFileSync(pathFor(event.sessionId), `${line}\n`);
          stored += 1;
        } catch {
          /* A malformed line is the collector's problem, not a reason to
             reject the batch that came with it. */
        }
      }

      return Response.json({ ok: true, stored });
    }

    if (request.method === "GET" && url.pathname.startsWith("/sessions/")) {
      const sessionId = url.pathname.slice("/sessions/".length);
      const file = pathFor(sessionId);

      if (!existsSync(file)) {
        return Response.json({ error: "no such session" }, { status: 404 });
      }

      return new Response(readFileSync(file, "utf8"), {
        headers: { "content-type": "application/x-ndjson" },
      });
    }

    return Response.json({ error: "not found" }, { status: 404 });
  },
});

process.stdout.write(`ingest listening on http://127.0.0.1:${server.port}\n`);
process.stdout.write(`storing sessions in ${STORE}\n`);
