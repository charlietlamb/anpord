import { expect, test } from "bun:test";
import { ConfigProvider, Effect } from "effect";
import { evalTrigger } from "../../src/cli/eval-trigger";

const resolveTrigger = (values: Record<string, string> = {}) =>
  Effect.runPromise(
    evalTrigger.pipe(
      Effect.withConfigProvider(
        ConfigProvider.fromMap(new Map(Object.entries(values)))
      )
    )
  );

test("local CLI needs no CI configuration", async () => {
  expect(await resolveTrigger()).toEqual({ source: "cli" });
});

test("generic CI records its source without inventing a link", async () => {
  expect(await resolveTrigger({ CI: "true" })).toEqual({ source: "ci" });
});

test("GitHub records the exact workflow attempt without a token", async () => {
  expect(
    await resolveTrigger({
      GITHUB_ACTIONS: "true",
      GITHUB_REPOSITORY: "acme/app",
      GITHUB_RUN_ID: "123",
      GITHUB_RUN_ATTEMPT: "2",
    })
  ).toEqual({
    source: "ci",
    url: "https://github.com/acme/app/actions/runs/123/attempts/2",
  });
});

test("incomplete GitHub context fails before submission", async () => {
  await expect(resolveTrigger({ GITHUB_ACTIONS: "true" })).rejects.toThrow();
});
