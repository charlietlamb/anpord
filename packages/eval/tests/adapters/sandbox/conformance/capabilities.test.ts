import { afterAll, describe, expect, it } from "bun:test";
import { Effect, Option } from "effect";
import { collect, outputOf, WORKSPACE, withSandbox } from "./harness";
import { PROVIDERS, type ProviderUnderTest } from "./providers";
import { declared, reportCapabilities } from "./summary";

const CACHE_STORE = "anpord-conformance-cache";

/**
 * A capability is either implemented and proved, or declined and absent.
 *
 * There is no third state: the port carries each as an `Option`, so a provider
 * that declares one must hand over the thing itself, and one that declines
 * cannot leave behind a method that only fails.
 */
const capabilities = (provider: ProviderUnderTest) => {
  const minutes = (provider.slowSeconds + 180) * 1000;

  describe(`${provider.name} declares what it can do`, () => {
    it(
      "says the same thing about itself every time it is opened",
      async () => {
        const declaration = (cache?: string) =>
          withSandbox(
            provider.adapter,
            (sandbox) =>
              Effect.succeed({
                cache: Option.isSome(sandbox.cache),
                resumable: Option.isSome(sandbox.resumable),
              }),
            cache
          );

        const [first, second, asked] = await Promise.all([
          declaration(),
          declaration(),
          declaration(CACHE_STORE),
        ]);

        /* A cache is reported as the provider can offer one when asked: a
         handle opened without a store has none because none was wanted, which
         says nothing about whether the provider has anywhere to keep one. */
        declared.set(provider.name, {
          cache: asked.cache,
          resumable: first.resumable,
        });

        expect(first).toEqual(second);
        expect(asked.resumable).toBe(first.resumable);
      },
      minutes
    );

    it(
      "either resumes a command and can be polled for it, or offers no start at all",
      async () => {
        const outcome = await withSandbox(provider.adapter, (sandbox) =>
          Option.match(sandbox.resumable, {
            onNone: () => Effect.succeed(Option.none<string>()),
            onSome: (resumable) =>
              Effect.gen(function* () {
                const started = yield* resumable.start(
                  "echo detached-and-polled",
                  { cwd: WORKSPACE }
                );

                return Option.some(
                  yield* Effect.iterate(yield* resumable.progress(started), {
                    body: () =>
                      Effect.sleep("1 second").pipe(
                        Effect.andThen(resumable.progress(started))
                      ),
                    while: (seen) => seen.exitCode === null,
                  }).pipe(
                    Effect.timeout(`${provider.slowSeconds + 60} seconds`),
                    Effect.map(
                      (settled) => `${settled.exitCode}:${settled.stdout}`
                    )
                  )
                );
              }),
          })
        );

        /* A provider that declined is proved to have declined, not skipped: the
         suite reports it as a capability it does not have. */
        if (Option.isNone(outcome)) {
          expect(declared.get(provider.name)?.resumable).toBe(false);
          return;
        }

        expect(outcome.value).toStartWith("0:");
        expect(outcome.value).toContain("detached-and-polled");
      },
      minutes
    );

    it(
      "either keeps what a prepare built and gives it back, or offers no cache at all",
      async () => {
        const key = `conformance-${Date.now()}`;

        const outcome = await withSandbox(
          provider.adapter,
          (sandbox) =>
            Option.match(sandbox.cache, {
              onNone: () => Effect.succeed(Option.none<string>()),
              onSome: (cache) =>
                Effect.gen(function* () {
                  const kept = `${WORKSPACE}/kept`;

                  yield* sandbox.writeFile(`${kept}/built.txt`, "an install\n");

                  expect(yield* cache.has(key)).toBe(false);

                  yield* cache.save(key, kept);

                  expect(yield* cache.has(key)).toBe(true);

                  yield* collect(sandbox.exec(`rm -rf ${kept}`));

                  const restored = yield* cache.restore(key, kept);

                  expect(restored).toBe(true);

                  return Option.some(
                    outputOf(
                      yield* collect(sandbox.exec(`cat ${kept}/built.txt`))
                    )
                  );
                }),
            }),
          CACHE_STORE
        );

        if (Option.isNone(outcome)) {
          expect(declared.get(provider.name)?.cache).toBe(false);
          return;
        }

        expect(outcome.value).toContain("an install");
      },
      minutes
    );

    /* A cache nobody asked for is a volume mounted and paid for on every
       trial that had no use for one. */
    it(
      "offers no cache when none was asked for",
      async () => {
        const offered = await withSandbox(provider.adapter, (sandbox) =>
          Effect.succeed(Option.isSome(sandbox.cache))
        );

        expect(offered).toBe(false);
      },
      minutes
    );

    it(
      "restores nothing for a key nobody wrote",
      async () => {
        const outcome = await withSandbox(
          provider.adapter,
          (sandbox) =>
            Option.match(sandbox.cache, {
              onNone: () => Effect.succeed(Option.none<boolean>()),
              onSome: (cache) =>
                Effect.all({
                  has: cache.has(`never-written-${Date.now()}`),
                  restored: cache.restore(
                    `never-written-${Date.now()}`,
                    `${WORKSPACE}/absent`
                  ),
                }).pipe(
                  Effect.map(({ has, restored }) =>
                    Option.some(has || restored)
                  )
                ),
            }),
          CACHE_STORE
        );

        if (Option.isSome(outcome)) {
          expect(outcome.value).toBe(false);
        }
      },
      minutes
    );
  });
};

afterAll(reportCapabilities);

for (const provider of PROVIDERS) {
  if (provider.credentialled) {
    capabilities(provider);
    continue;
  }

  describe.skip(`${provider.name} declares what it can do (needs ${provider.needs})`, () => {
    it("was not exercised", () => {
      expect(provider.credentialled).toBe(false);
    });
  });
}
