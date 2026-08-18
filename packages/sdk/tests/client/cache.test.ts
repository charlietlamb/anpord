import { describe, expect, test } from "bun:test";
import type { PublicPromptWithVersions } from "@anpord/schema/public/shapes";
import { DateTime, Effect, Ref, TestClock, TestContext } from "effect";
import { layer, type PromptCache } from "../../src/client/cache/prompt-cache";
import { resolvePrompt } from "../../src/client/cache/resolve";
import { settingsFrom } from "../../src/client/cache/settings";
import type { PromptSelector } from "../../src/client/cache/types";
import { AnpordError } from "../../src/client/errors";

type Answer = PublicPromptWithVersions;

/** A prompt shaped the way the API returns one, so the cache is exercised
 * against what it actually holds rather than a stand-in. */
const answer = (content: string): Answer =>
  ({
    channel: "production",
    config: {},
    content,
    createdAt: DateTime.unsafeMake(0),
    id: "greeting",
    message: null,
    name: "greeting",
    version: 1,
  }) as Answer;

/** Counts what reached the network, so a test can say how many calls a run
 * made rather than inferring it from the values that came back. */
const counting = (
  answers: readonly (Answer | AnpordError)[],
  fixed?: Answer | AnpordError
) =>
  Effect.gen(function* () {
    const calls = yield* Ref.make(0);

    const fetch = (_selector: PromptSelector) =>
      Effect.gen(function* () {
        const at = yield* Ref.getAndUpdate(calls, (n) => n + 1);
        const answer = answers[at] ?? fixed ?? answers.at(-1);
        return answer instanceof AnpordError
          ? yield* Effect.fail(answer)
          : (answer as Answer);
      });

    return { calls, fetch };
  });

const selector: PromptSelector = { id: "greeting" };

const withCache = <A, E>(
  answers: readonly (Answer | AnpordError)[],
  body: (calls: Ref.Ref<number>) => Effect.Effect<A, E, PromptCache>,
  options: Parameters<typeof settingsFrom>[0] = {}
) =>
  Effect.gen(function* () {
    const { calls, fetch } = yield* counting(answers);
    return yield* body(calls).pipe(
      Effect.provide(layer(settingsFrom(options), fetch))
    );
  }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise);

describe("reading the same prompt twice", () => {
  test("asks the network once", async () => {
    const calls = await withCache([answer("one")], (counter) =>
      Effect.gen(function* () {
        yield* resolvePrompt(selector);
        yield* resolvePrompt(selector);
        return yield* Ref.get(counter);
      })
    );

    expect(calls).toBe(1);
  });

  test("keeps a channel and a version apart", async () => {
    const calls = await withCache(
      [answer("a"), answer("b"), answer("c")],
      (counter) =>
        Effect.gen(function* () {
          yield* resolvePrompt({ id: "greeting" });
          yield* resolvePrompt({ channel: "staging", id: "greeting" });
          yield* resolvePrompt({ id: "greeting", version: 2 });
          return yield* Ref.get(counter);
        })
    );

    expect(calls).toBe(3);
  });

  /** A response asked for without history has no versions to hand to a caller
   * who wanted them. */
  test("keeps a request for history apart from one without", async () => {
    const calls = await withCache([answer("a"), answer("b")], (counter) =>
      Effect.gen(function* () {
        yield* resolvePrompt({ id: "greeting" });
        yield* resolvePrompt({
          id: "greeting",
          includeVersions: true,
        });
        return yield* Ref.get(counter);
      })
    );

    expect(calls).toBe(2);
  });
});

describe("an answer that has aged past its window", () => {
  test("is served immediately rather than waited on", async () => {
    const result = await withCache([answer("old"), answer("new")], () =>
      Effect.gen(function* () {
        yield* resolvePrompt(selector);
        yield* TestClock.adjust("30 seconds");
        return yield* resolvePrompt(selector);
      })
    );

    expect(result.value.content).toBe("old");
    expect(result.metadata.freshness).toBe("cached");
  });

  test("is replaced by the refresh it started", async () => {
    const result = await withCache([answer("old"), answer("new")], () =>
      Effect.gen(function* () {
        yield* resolvePrompt(selector);
        yield* TestClock.adjust("30 seconds");
        yield* resolvePrompt(selector);
        yield* TestClock.adjust("1 second");
        return yield* resolvePrompt(selector);
      })
    );

    expect(result.value.content).toBe("new");
  });

  /** A pinned version cannot change, so asking again would only cost a call. */
  test("never expires when a version is pinned", async () => {
    const calls = await withCache([answer("one"), answer("two")], (counter) =>
      Effect.gen(function* () {
        yield* resolvePrompt({ id: "greeting", version: 3 });
        yield* TestClock.adjust("1 hour");
        yield* resolvePrompt({ id: "greeting", version: 3 });
        return yield* Ref.get(counter);
      })
    );

    expect(calls).toBe(1);
  });
});

describe("a failure", () => {
  /** Given a zero window, so the moment the clock moves at all the next call
   * asks again rather than waiting out a window it never earned. */
  test("is not held, so the next call tries again", async () => {
    const calls = await withCache(
      [
        new AnpordError("down", { cause: undefined, status: 500 }),
        answer("back"),
      ],
      (counter) =>
        Effect.gen(function* () {
          yield* Effect.either(resolvePrompt(selector));
          yield* TestClock.adjust("1 milli");
          yield* Effect.either(resolvePrompt(selector));
          return yield* Ref.get(counter);
        })
    );

    expect(calls).toBe(2);
  });

  test("is answered by what is held, however old, when nothing else can be", async () => {
    const result = await withCache(
      [
        answer("written"),
        new AnpordError("down", { cause: undefined, status: 500 }),
      ],
      () =>
        Effect.gen(function* () {
          yield* resolvePrompt(selector);
          yield* TestClock.adjust("48 hours");
          return yield* resolvePrompt(selector);
        })
    );

    expect(result.value.content).toBe("written");
    expect(result.metadata.freshness).toBe("stale");
  });
});

describe("what the caller is given when the network fails", () => {
  /** The ordering that matters: a prompt somebody wrote and promoted beats a
   * string written at deploy time, even when the string was offered. */
  test("prefers what was written over the fallback it was given", async () => {
    const result = await withCache(
      [
        answer("written"),
        new AnpordError("down", { cause: undefined, status: 500 }),
      ],
      () =>
        Effect.gen(function* () {
          yield* resolvePrompt(selector);
          yield* TestClock.adjust("48 hours");
          return yield* resolvePrompt({
            ...selector,
            fallback: "hardcoded",
          });
        })
    );

    expect(result.value.content).toBe("written");
    expect(result.metadata.freshness).toBe("stale");
  });

  test("uses the fallback when nothing was ever written", async () => {
    const result = await withCache(
      [new AnpordError("down", { cause: undefined, status: 500 })],
      () => resolvePrompt({ ...selector, fallback: "hardcoded" })
    );

    expect(result.value.content).toBe("hardcoded");
    expect(result.metadata.freshness).toBe("fallback");
  });

  test("fails when it was given no fallback and holds nothing", async () => {
    const result = await withCache(
      [new AnpordError("down", { cause: undefined, status: 500 })],
      () => Effect.either(resolvePrompt(selector))
    );

    expect(result._tag).toBe("Left");
  });

  /** A prompt that does not exist is a typo in the caller's code, and a
   * fallback would hide it until someone wondered why the model was odd. */
  test("refuses a fallback when the server says the prompt is not there", async () => {
    const result = await withCache(
      [new AnpordError("no such prompt", { cause: undefined, status: 404 })],
      () => Effect.either(resolvePrompt({ ...selector, fallback: "hardcoded" }))
    );

    expect(result._tag).toBe("Left");
  });

  test("refuses a fallback when the key is rejected", async () => {
    const result = await withCache(
      [new AnpordError("bad key", { cause: undefined, status: 401 })],
      () => Effect.either(resolvePrompt({ ...selector, fallback: "hardcoded" }))
    );

    expect(result._tag).toBe("Left");
  });

  test("names a version no answer can carry, so a fallback is recognisable", async () => {
    const result = await withCache(
      [new AnpordError("down", { cause: undefined, status: 503 })],
      () => resolvePrompt({ ...selector, fallback: "hardcoded" })
    );

    expect((result.value as unknown as { version: number }).version).toBe(0);
  });
});
