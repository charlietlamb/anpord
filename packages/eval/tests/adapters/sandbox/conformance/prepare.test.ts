import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { SuspenderSleeping } from "../../../../src/services/suspender";
import { runPrepare } from "../../../../src/services/workspace-setup";
import { WORKSPACE, withSandbox } from "./harness";
import { PROVIDERS, type ProviderUnderTest } from "./providers";

const SOURCE = `
const total = [1, 2, 3].reduce((sum, n) => sum + n, 0);
console.log("preparing the workspace");
console.log("ANPORD_PREPARE_RESULT=" + JSON.stringify({ rendererPort: 4173, total }));
`;

const FAILING = `
console.error("npm ci failed: ENOENT missing lockfile");
process.exit(1);
`;

/**
 * The path Job 1 fixed, run for real on every provider.
 *
 * Only Daytona resumes a command, so on every other provider this exercises
 * the streamed fallback. Before the fix it failed with SandboxUnavailable
 * before the prepare ran at all.
 */
const prepares = (provider: ProviderUnderTest) => {
  const minutes = (provider.slowSeconds + 180) * 1000;

  describe(`${provider.name} runs a case's prepare step`, () => {
    it(
      "runs it and returns what it reported",
      async () => {
        const reported = await withSandbox(provider.adapter, (sandbox) =>
          runPrepare({
            prepare: { name: "prepareRepoImage", source: SOURCE },
            sandbox,
            workspace: WORKSPACE,
          }).pipe(Effect.provide(SuspenderSleeping))
        );

        expect(reported).toEqual({ rendererPort: 4173, total: 6 });
      },
      minutes
    );

    it(
      "reports a prepare that failed, with what it wrote",
      async () => {
        const exit = await withSandbox(provider.adapter, (sandbox) =>
          runPrepare({
            prepare: { name: "prepareRepoImage", source: FAILING },
            sandbox,
            workspace: WORKSPACE,
          }).pipe(Effect.provide(SuspenderSleeping), Effect.either)
        );

        expect(exit._tag).toBe("Left");
        expect(JSON.stringify(exit)).toContain("ENOENT missing lockfile");
      },
      minutes
    );
  });
};

for (const provider of PROVIDERS) {
  if (provider.credentialled) {
    prepares(provider);
    continue;
  }

  describe.skip(`${provider.name} runs a case's prepare step (needs ${provider.needs})`, () => {
    it("was not exercised", () => {
      expect(provider.credentialled).toBe(false);
    });
  });
}
