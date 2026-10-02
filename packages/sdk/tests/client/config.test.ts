import { describe, expect, test } from "bun:test";
import { WEB_ORIGIN } from "@sphynx/schema/public/origins";
import { ConfigProvider, Effect, Option, Redacted } from "effect";
import { apiKeyConfig, webUrlConfig } from "../../src/client/config";

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
    ["empty", { SPHYNX_API_KEY: "" }],
    ["only whitespace", { SPHYNX_API_KEY: "  \t " }],
  ])("is absent when %s", (_, env) => {
    expect(keyFrom(env)).toEqual(Option.none());
  });

  test("is read without the whitespace around it", () => {
    expect(keyFrom({ SPHYNX_API_KEY: " ak_live_123\n" })).toEqual(
      Option.some("ak_live_123")
    );
  });
});

describe("the dashboard URL from the environment", () => {
  test("falls back to the canonical web origin, not the bare apex domain", () => {
    const webUrl = Effect.runSync(
      webUrlConfig.pipe(
        Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
      )
    );

    expect(webUrl).toBe(WEB_ORIGIN);
    expect(webUrl).toBe("https://www.sphynx.sh");
  });
});
