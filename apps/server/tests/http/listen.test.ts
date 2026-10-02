import { describe, expect, test } from "bun:test";
import { Deferred, type Duration, Effect, Exit, Scope } from "effect";
import { listen } from "../../src/http/listen";

type Fetch = (request: Request) => Promise<Response>;

const freePort = () => {
  const probe = Bun.serve({ fetch: () => new Response(), port: 0 });
  const { port } = probe;
  probe.stop(true);
  if (port === undefined) {
    throw new Error("Bun did not report the port it bound");
  }
  return port;
};

const optionsFor = (
  port: number,
  drainTimeout: Duration.DurationInput = "5 seconds"
) => ({
  drainTimeout,
  hostname: "127.0.0.1",
  maxRequestBodySize: 1024,
  port,
});

const CURL_FAILURES: Record<number, string> = {
  7: "refused",
  28: "timed out",
  52: "closed without a response",
};

const call = async (port: number, path: string, seconds = 2) => {
  const client = Bun.spawn(
    [
      "curl",
      "--silent",
      "--max-time",
      String(seconds),
      "--write-out",
      " %{http_code}",
      `http://127.0.0.1:${port}${path}`,
    ],
    { stderr: "ignore", stdout: "pipe" }
  );
  const output = await new Response(client.stdout).text();
  const failure = CURL_FAILURES[await client.exited];

  return (
    failure ??
    `${output.slice(output.lastIndexOf(" ") + 1)} ${output.slice(0, output.lastIndexOf(" "))}`
  );
};

const KEEP_ALIVE_CLIENT = `
const socket = require("node:net").connect(Number(process.env.PORT), "127.0.0.1", () =>
  socket.write("GET /idle HTTP/1.1\\r\\nHost: sphynx.test\\r\\n\\r\\n")
);
socket.once("data", () => process.stdout.write("answered\\n"));
socket.on("close", () => {
  process.stdout.write("closed\\n");
  process.exit(0);
});
setTimeout(() => {
  process.stdout.write("still open\\n");
  process.exit(0);
}, 3000);
`;

const keepAlive = async (port: number) => {
  const client = Bun.spawn([process.execPath, "-e", KEEP_ALIVE_CLIENT], {
    env: { ...process.env, PORT: String(port) },
    stdout: "pipe",
  });
  const reader = client.stdout.getReader();
  const decoder = new TextDecoder();
  let seen = "";

  while (!seen.includes("answered")) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    seen += decoder.decode(value);
  }

  const afterAnswer = async () => {
    let rest = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        return rest.trim();
      }
      rest += decoder.decode(value);
    }
  };

  return { answered: seen.trim(), next: afterAnswer };
};

const start = (
  routes: Effect.Effect<Fetch>,
  port: number,
  drain?: Duration.DurationInput
) => {
  const scope = Effect.runSync(Scope.make());
  const started = Effect.runPromise(
    listen(routes, optionsFor(port, drain)).pipe(Scope.extend(scope))
  );
  const stop = () => Effect.runPromise(Scope.close(scope, Exit.void));

  return { started, stop };
};

const gate = () => {
  const { promise, resolve } = Promise.withResolvers<void>();
  return { open: () => resolve(), opened: promise };
};

describe("listen", () => {
  test("the port stays closed until the routes are mounted", async () => {
    const port = freePort();
    const mounted = Effect.runSync(Deferred.make<void>());
    const routes = Deferred.await(mounted).pipe(
      Effect.as<Fetch>(() => Promise.resolve(new Response("ready")))
    );
    const server = start(routes, port);

    await Bun.sleep(50);
    expect(await call(port, "/api/healthz")).toBe("refused");

    Effect.runSync(Deferred.succeed(mounted, undefined));
    await server.started;
    expect(await call(port, "/api/healthz")).toBe("200 ready");

    await server.stop();
  });

  test("shutdown lets a running request finish and refuses new ones", async () => {
    const port = freePort();
    const entered = gate();
    const release = gate();
    const routes = Effect.succeed<Fetch>(async (request) => {
      if (new URL(request.url).pathname === "/slow") {
        entered.open();
        await release.opened;
        return new Response("finished");
      }
      return new Response("fast");
    });
    const server = start(routes, port);
    await server.started;

    const running = call(port, "/slow");
    await entered.opened;

    let stopped = false;
    const stopping = server.stop().then(() => {
      stopped = true;
    });
    await Bun.sleep(50);

    expect(await call(port, "/fast")).toBe("refused");
    expect(stopped).toBe(false);

    release.open();
    expect(await running).toBe("200 finished");
    await stopping;
    expect(stopped).toBe(true);
  });

  test("shutdown closes an idle keep-alive connection at once while a request still runs", async () => {
    const port = freePort();
    const entered = gate();
    const release = gate();
    const routes = Effect.succeed<Fetch>(async (request) => {
      if (new URL(request.url).pathname === "/slow") {
        entered.open();
        await release.opened;
        return new Response("finished");
      }
      return new Response("idle");
    });
    const server = start(routes, port);
    await server.started;

    const running = call(port, "/slow");
    await entered.opened;
    const idle = await keepAlive(port);
    expect(idle.answered).toBe("answered");

    let stopped = false;
    const stopping = server.stop().then(() => {
      stopped = true;
    });

    expect(await idle.next()).toBe("closed");
    expect(stopped).toBe(false);

    release.open();
    expect(await running).toBe("200 finished");
    await stopping;
  });

  test("a request that outlives the drain timeout does not hold shutdown open", async () => {
    const port = freePort();
    const entered = gate();
    const routes = Effect.succeed<Fetch>(() => {
      entered.open();
      return new Promise<Response>(() => undefined);
    });
    const server = start(routes, port, "100 millis");
    await server.started;

    const running = call(port, "/hangs", 1);
    await entered.opened;

    const started = performance.now();
    await server.stop();

    expect(performance.now() - started).toBeLessThan(1000);
    await running;
  });
});
