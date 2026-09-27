import { afterAll, expect, test } from "bun:test";
import { make } from "@anpord/schema/public/client";
import { FetchHttpClient } from "@effect/platform";
import {
  Cause,
  Duration,
  Effect,
  Exit,
  Fiber,
  Redacted,
  TestClock,
  TestContext,
} from "effect";
import { asAnpordError } from "../../src/client/errors";

const posted: (() => void)[] = [];
let heardPost = false;
const server = Bun.serve({
  fetch: (request) => {
    if (request.method === "GET") {
      return new Response("", { status: 404 });
    }
    heardPost = true;
    for (const wake of posted.splice(0)) {
      wake();
    }
    return new Promise<Response>(() => undefined);
  },
  port: 0,
});
const origin = `http://127.0.0.1:${server.port}`;

afterAll(() => server.stop(true));

const post = Effect.promise(
  () => new Promise<void>((wake) => (heardPost ? wake() : posted.push(wake)))
);

test("a server that took the request but never answered is not called unreachable", async () => {
  const exit = await Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* make({
        apiKey: Redacted.make("key"),
        baseUrl: origin,
      });
      const fiber = yield* Effect.fork(client.auth.whoami({ payload: {} }));
      yield* post;
      yield* TestClock.adjust(Duration.seconds(30));
      return yield* Fiber.await(fiber);
    }).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.provide(TestContext.TestContext)
    )
  );

  expect(
    Exit.isFailure(exit)
      ? asAnpordError(Cause.squash(exit.cause)).message
      : null
  ).toBe(
    `Anpord at ${origin} took more than 30 seconds to answer. Try again in a moment.`
  );
});
