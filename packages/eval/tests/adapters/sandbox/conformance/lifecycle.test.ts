import { describe, expect, it } from "bun:test";
import { Effect, Either } from "effect";
import type { ExecChunk } from "../../../../src/ports/sandbox";
import { collect, exitOf, WORKSPACE } from "./harness";
import { PROVIDERS, type ProviderUnderTest } from "./providers";

/* A sandbox answers only if the command both ran and succeeded. Whichever way
   a provider reports a destroyed one -- the stream fails, the attach fails, or
   the command exits non-zero -- it is gone. What it must not do is keep
   serving commands. */
const answered = (outcome: Either.Either<readonly ExecChunk[], unknown>) =>
  Either.isRight(outcome) && exitOf(outcome.right) === 0;

const reach = (run: Effect.Effect<readonly ExecChunk[], unknown>) =>
  run.pipe(Effect.either, Effect.map(answered));

/* Destroy is not covered by withSandbox, which destroys as it releases: this
   has to destroy in the middle and then reach for the sandbox again. */
const stillAnswersAfterDestroy = (provider: ProviderUnderTest) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const adapter = yield* provider.adapter;

      const sandbox = yield* adapter.open({
        autoStopMinutes: 5,
        provider: adapter.provider,
        workspace: WORKSPACE,
      });

      const before = yield* reach(collect(sandbox.exec("echo alive")));

      yield* adapter.destroy(sandbox);

      const held = yield* reach(collect(sandbox.exec("echo alive")));
      const fresh = yield* reach(
        adapter
          .attach(sandbox.id)
          .pipe(Effect.flatMap((handle) => collect(handle.exec("echo alive"))))
      );

      return { after: held || fresh, before };
    }).pipe(Effect.scoped, Effect.orDie)
  );

const lifecycle = (provider: ProviderUnderTest) => {
  const minutes = (provider.slowSeconds + 180) * 1000;

  describe(`${provider.name} destroys a sandbox`, () => {
    it(
      "makes it unreachable",
      async () => {
        const { after, before } = await stillAnswersAfterDestroy(provider);

        expect(before).toBe(true);
        expect(after).toBe(false);
      },
      minutes
    );
  });
};

for (const provider of PROVIDERS) {
  if (provider.credentialled) {
    lifecycle(provider);
    continue;
  }

  describe.skip(`${provider.name} destroys a sandbox (needs ${provider.needs})`, () => {
    it("was not exercised", () => {
      expect(provider.credentialled).toBe(false);
    });
  });
}
