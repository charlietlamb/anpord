import { afterAll, describe, expect, it } from "bun:test";
import { createServer, type Socket } from "node:net";
import {
  FetchHttpClient,
  HttpClientError,
  HttpClientRequest,
} from "@effect/platform";
import { make } from "@sphynx/schema/public/client";
import {
  Duration,
  Effect,
  Either,
  Fiber,
  Redacted,
  TestClock,
  TestContext,
} from "effect";
import { retryTransient } from "../../src/cli/transient";
import { asSphynxError } from "../../src/client/errors";

const held: Socket[] = [];
const silent = createServer((socket) => {
  held.push(socket);
});
await new Promise<void>((ready) => silent.listen(0, "127.0.0.1", ready));
const silentPort = (silent.address() as { port: number }).port;

afterAll(() => {
  for (const socket of held) {
    socket.destroy();
  }
  silent.close();
});

const unreachable = (origin: string) =>
  `Unable to reach Sphynx at ${origin}. Check your network connection, or set SPHYNX_BASE_URL if your Sphynx server is at another address.`;

const contact = async (baseUrl: string, holding = false) => {
  const startedAt = Date.now();
  const result = await Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* make({ apiKey: Redacted.make("key"), baseUrl });
      const asked = retryTransient(client.auth.whoami({ payload: {} }));
      return yield* Effect.either(
        holding ? Effect.uninterruptible(asked) : asked
      );
    }).pipe(Effect.provide(FetchHttpClient.layer))
  );

  return {
    elapsedMs: Date.now() - startedAt,
    said: Either.isLeft(result)
      ? asSphynxError(result.left).message
      : "answered",
  };
};

describe("first contact with Sphynx", () => {
  it("gives up fast on a refused connection, and says how to fix it", async () => {
    const reached = await contact("http://127.0.0.1:1");

    expect(reached.elapsedMs).toBeLessThan(5000);
    expect(reached.said).toBe(unreachable("http://127.0.0.1:1"));
  });

  it("gives up as fast on a server that accepts the connection and never answers", async () => {
    const origin = `http://127.0.0.1:${silentPort}`;
    const reached = await contact(origin);

    expect(reached.elapsedMs).toBeLessThan(5000);
    expect(reached.said).toBe(unreachable(origin));
    expect(held.length).toBeGreaterThan(0);
  }, 20_000);

  it("gives up as fast while opening something it must close, as a batch is", async () => {
    const origin = `http://127.0.0.1:${silentPort}`;
    const reached = await contact(origin, true);

    expect(reached.elapsedMs).toBeLessThan(5000);
    expect(reached.said).toBe(unreachable(origin));
  }, 20_000);

  it("gives up as fast on an address that drops every packet", async () => {
    const reached = await contact("http://192.0.2.1");

    expect(reached.elapsedMs).toBeLessThan(5000);
    expect(reached.said).toBe(unreachable("http://192.0.2.1"));
  }, 20_000);
});

describe("a request once the run is under way", () => {
  const refused = new HttpClientError.RequestError({
    cause: new Error("connect ECONNREFUSED 127.0.0.1:1"),
    reason: "Transport",
    request: HttpClientRequest.post("http://127.0.0.1:1/v1/runner.report"),
  });

  it("keeps retrying a connection that drops", async () => {
    let attempts = 0;
    const call = Effect.suspend(() => {
      attempts += 1;
      return attempts <= 4 ? Effect.fail(refused) : Effect.succeed("ok");
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const fiber = yield* Effect.fork(retryTransient(call));
        yield* TestClock.adjust(Duration.minutes(1));
        return yield* Fiber.join(fiber);
      }).pipe(Effect.provide(TestContext.TestContext))
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(5);
  });
});
