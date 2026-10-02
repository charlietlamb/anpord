import { afterEach, describe, expect, it } from "bun:test";
import { createServer, type Server } from "node:net";
import { FetchHttpClient } from "@effect/platform";
import {
  Cause,
  Duration,
  Effect,
  Exit,
  Fiber,
  Option,
  Redacted,
  TestClock,
  TestContext,
} from "effect";
import { make } from "../../src/public/client";

const closers: (() => void)[] = [];

afterEach(() => {
  for (const close of closers.splice(0)) {
    close();
  }
});

const never = () => new Promise<Response>(() => undefined);

const serving = (behaviour: {
  readonly answersProbe: () => boolean;
  readonly answersCalls: boolean;
}) => {
  const methods: string[] = [];
  const waiting: (() => void)[] = [];
  const server = Bun.serve({
    fetch: (request) => {
      methods.push(request.method);
      for (const wake of waiting.splice(0)) {
        wake();
      }
      if (request.method === "GET") {
        return behaviour.answersProbe()
          ? new Response("", { status: 404 })
          : never();
      }
      return behaviour.answersCalls ? Response.json({}) : never();
    },
    port: 0,
  });
  closers.push(() => server.stop(true));
  const heard = (method: string) =>
    Effect.promise(async () => {
      while (!methods.includes(method)) {
        await new Promise<void>((wake) => waiting.push(wake));
      }
    });
  return { heard, methods, url: `http://127.0.0.1:${server.port}` };
};

const silent = async () => {
  const received: string[] = [];
  let arrived: () => void = () => undefined;
  const reached = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  const server: Server = createServer((socket) => {
    socket.on("data", (chunk) => {
      received.push(chunk.toString());
      arrived();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  closers.push(() => server.close());
  const address = server.address();
  const port =
    typeof address === "object" && address !== null ? address.port : 0;
  return {
    reached: Effect.promise(() => reached),
    received,
    url: `http://127.0.0.1:${port}`,
  };
};

const clientAt = (baseUrl: string) =>
  make({ apiKey: Redacted.make("key"), baseUrl }).pipe(
    Effect.provide(FetchHttpClient.layer)
  );

const failureOf = <A, E>(exit: Exit.Exit<A, E>) =>
  Exit.isFailure(exit) ? Cause.squash(exit.cause) : null;

const run = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(effect.pipe(Effect.provide(TestContext.TestContext)));

const unreachable = { _tag: "RequestError", reason: "Transport" };

describe("a request Sphynx never answers", () => {
  it("fails a read in 4 seconds when the server never answers at all", async () => {
    const server = await silent();

    const { early, exit } = await run(
      Effect.gen(function* () {
        const client = yield* clientAt(server.url);
        const fiber = yield* Effect.fork(client.auth.whoami({ payload: {} }));
        yield* server.reached;
        yield* TestClock.adjust(Duration.millis(3900));
        const pending = yield* Fiber.poll(fiber);
        yield* TestClock.adjust(Duration.millis(100));
        return { early: pending, exit: yield* Fiber.await(fiber) };
      })
    );

    expect(Option.isNone(early)).toBe(true);
    expect(failureOf(exit)).toMatchObject(unreachable);
    expect(server.received.join("")).not.toContain("POST");
  });

  it("fails a read once 30 seconds pass after the server stopped answering", async () => {
    const server = serving({ answersCalls: false, answersProbe: () => true });

    const { early, exit } = await run(
      Effect.gen(function* () {
        const client = yield* clientAt(server.url);
        const fiber = yield* Effect.fork(client.auth.whoami({ payload: {} }));
        yield* server.heard("POST");
        yield* TestClock.adjust(Duration.seconds(29));
        const pending = yield* Fiber.poll(fiber);
        yield* TestClock.adjust(Duration.seconds(1));
        return { early: pending, exit: yield* Fiber.await(fiber) };
      })
    );

    expect(Option.isNone(early)).toBe(true);
    expect(failureOf(exit)).toMatchObject(unreachable);
  });

  it("never cuts off a change once the server has it", async () => {
    const server = serving({ answersCalls: false, answersProbe: () => true });

    const pending = await run(
      Effect.gen(function* () {
        const client = yield* clientAt(server.url);
        const fiber = yield* Effect.fork(
          client.connectors.remove({ payload: { id: "connector_1" } })
        );
        yield* server.heard("POST");
        yield* TestClock.adjust(Duration.minutes(10));
        const polled = yield* Fiber.poll(fiber);
        yield* Fiber.interrupt(fiber);
        return polled;
      })
    );

    expect(Option.isNone(pending)).toBe(true);
    expect(server.methods).toEqual(["GET", "POST"]);
  });

  it("fails a change in 4 seconds, before sending it, when nothing answers", async () => {
    const server = await silent();

    const exit = await run(
      Effect.gen(function* () {
        const client = yield* clientAt(server.url);
        const fiber = yield* Effect.fork(
          client.connectors.remove({ payload: { id: "connector_1" } })
        );
        yield* server.reached;
        yield* TestClock.adjust(Duration.seconds(4));
        return yield* Fiber.await(fiber);
      })
    );

    expect(failureOf(exit)).toMatchObject(unreachable);
    expect(server.received.join("")).toStartWith("GET / HTTP/1.1");
    expect(server.received.join("")).not.toContain("POST");
  });
});

describe("checking that Sphynx answers", () => {
  it("asks once for a client, however many requests run at once or after", async () => {
    const server = serving({ answersCalls: true, answersProbe: () => true });

    await run(
      Effect.gen(function* () {
        const client = yield* clientAt(server.url);
        const whoami = Effect.either(client.auth.whoami({ payload: {} }));
        yield* Effect.all([whoami, whoami, whoami, whoami, whoami], {
          concurrency: "unbounded",
        });
        yield* whoami;
        yield* whoami;
      })
    );

    expect(server.methods.filter((method) => method === "GET")).toEqual([
      "GET",
    ]);
    expect(server.methods.filter((method) => method === "POST")).toHaveLength(
      7
    );
  });

  it("asks again after a first contact that got no answer", async () => {
    let answering = false;
    const server = serving({
      answersCalls: true,
      answersProbe: () => answering,
    });

    const { first, second } = await run(
      Effect.gen(function* () {
        const client = yield* clientAt(server.url);
        const whoami = client.auth.whoami({ payload: {} });
        const fiber = yield* Effect.fork(Effect.either(whoami));
        yield* server.heard("GET");
        yield* TestClock.adjust(Duration.seconds(4));
        const failed = yield* Fiber.join(fiber);
        answering = true;
        return {
          first: failed,
          second: yield* Effect.either(whoami),
        };
      })
    );

    expect(first._tag === "Left" ? first.left : null).toMatchObject(
      unreachable
    );
    expect(second._tag === "Left" ? second.left._tag : "answered").toBe(
      "ParseError"
    );
    expect(server.methods.at(-2)).toBe("GET");
    expect(server.methods.at(-1)).toBe("POST");
  });
});
