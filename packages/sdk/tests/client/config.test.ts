import { describe, expect, test } from "bun:test";
import { ConfigProvider, Effect, Option, Redacted } from "effect";
import { apiKeyConfig } from "../../src/client/config";

const keyFrom = (env: Readonly<Record<string, string>>) =>
  Effect.runSync(
    Effect.option(apiKeyConfig).pipe(
      Effect.withConfigProvider(
        ConfigProvider.fromMap(new Map(Object.entries(env)))
      ),
      Effect.map(Option.map(Redacted.value))
    )
  );

describe("the API key from the environment", () => {
  test.each([
    ["unset", {}],
    ["empty", { ANPORD_API_KEY: "" }],
    ["only whitespace", { ANPORD_API_KEY: "  \t " }],
  ])("is absent when %s", (_, env) => {
    expect(keyFrom(env)).toEqual(Option.none());
  });

  test("is read without the whitespace around it", () => {
    expect(keyFrom({ ANPORD_API_KEY: " ak_live_123\n" })).toEqual(
      Option.some("ak_live_123")
    );
  });
});
