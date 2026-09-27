import { createRequire } from "node:module";
import { join } from "node:path";

const repositoryRoot = process.env.PERF_REPOSITORY_ROOT ?? process.cwd();
const probePort = Number(process.env.PERF_PROBE_PORT);

const pg = createRequire(join(repositoryRoot, "packages/db/package.json"))(
  "pg"
) as { Client: { prototype: { query: (...args: unknown[]) => unknown } } };

let queries = 0;
const original = pg.Client.prototype.query;
pg.Client.prototype.query = function counted(
  this: unknown,
  ...args: unknown[]
) {
  queries += 1;
  return original.apply(this, args);
};

if (Number.isInteger(probePort) && probePort > 0) {
  Bun.serve({
    fetch: (request) => {
      const { pathname } = new URL(request.url);
      if (pathname === "/queries") {
        return Response.json({ queries });
      }
      if (pathname === "/memory") {
        const usage = process.memoryUsage();
        return Response.json({ heapUsed: usage.heapUsed, rss: usage.rss });
      }
      return new Response("not found", { status: 404 });
    },
    hostname: "127.0.0.1",
    port: probePort,
  });
}
