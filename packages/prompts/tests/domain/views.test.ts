import { describe, expect, test } from "bun:test";
import { PromptId, PromptName } from "@anpord/schema/domain/prompts";
import { Effect, Exit, Schema } from "effect";
import { toResolved } from "../../src/domain/views";

const identity = {
  id: Schema.decodeSync(PromptId)("hello-world"),
  name: Schema.decodeSync(PromptName)("Hello World"),
};

const row = (overrides: Record<string, unknown>) =>
  ({
    author: { image: null, name: "Charlie Lamb" },
    internalId: "ver_01",
    promptInternalId: "pmt_01",
    version: 1,
    content: "hello",
    config: {},
    commitMessage: null,
    createdBy: "usr_01",
    createdAt: new Date(),
    ...overrides,
  }) as never;

describe("row decoding", () => {
  test("a valid row decodes to a view", () => {
    const view = Effect.runSync(
      Effect.orDie(toResolved(identity, null, row({})))
    );

    expect(Number(view.version)).toBe(1);
    expect(view.versionId).toBe("ver_01");
    expect(view.id).toBe(identity.id);
    expect(view.name).toBe(identity.name);
  });

  test("the author travels with the version", () => {
    const view = Effect.runSync(
      Effect.orDie(toResolved(identity, null, row({})))
    );

    expect(view.author?.name).toBe("Charlie Lamb");
  });

  test("a version whose author was removed still decodes", () => {
    const view = Effect.runSync(
      Effect.orDie(toResolved(identity, null, row({ author: null })))
    );

    expect(view.author).toBeNull();
  });

  test("a non-positive version is rejected rather than passed through", () => {
    const exit = Effect.runSyncExit(
      toResolved(identity, null, row({ version: 0 }))
    );

    expect(Exit.isFailure(exit)).toBe(true);
  });

  test("a null config is normalised rather than rejected", () => {
    const view = Effect.runSync(
      Effect.orDie(toResolved(identity, null, row({ config: null })))
    );

    expect(view.config).toEqual({});
  });
});
