import { Config, Effect, Layer } from "effect";
import type { ProviderName } from "../domain/cell";
import {
  type OpenSandbox,
  SandboxAdapters,
  SandboxProvider,
} from "../ports/sandbox";

/** Measured rather than guessed: five concurrent Daytona sandboxes boot without
 * rate limiting. Fifty is untested, so the default stays where the evidence
 * stops and the ceiling is configurable for when that changes. */
const concurrencyConfig = Config.all({
  daytona: Config.integer("EVAL_DAYTONA_CONCURRENCY").pipe(
    Config.withDefault(5)
  ),
  e2b: Config.integer("EVAL_E2B_CONCURRENCY").pipe(Config.withDefault(5)),
});

export const SandboxProviderLive = Layer.effect(
  SandboxProvider,
  Effect.gen(function* () {
    const adapters = yield* SandboxAdapters;
    const concurrency = yield* concurrencyConfig;

    /* Held in the layer because it is process-wide state about how many
       sandboxes may exist at once, not a property of any one call. */
    const permits: Record<ProviderName, Effect.Semaphore> = {
      daytona: yield* Effect.makeSemaphore(concurrency.daytona),
      e2b: yield* Effect.makeSemaphore(concurrency.e2b),
    };

    const open = (request: OpenSandbox) =>
      Effect.gen(function* () {
        const limit = permits[request.provider];

        /* The permit is itself a scoped resource. Wrapping acquireRelease with
           withPermits returns the permit the moment the sandbox is acquired,
           which admits an unbounded number of live sandboxes: measured, two
           through a one-permit semaphore. */
        yield* limit.take(1);
        yield* Effect.addFinalizer(() => limit.release(1));

        const adapter = yield* adapters.resolve(request.provider);

        return yield* Effect.acquireRelease(adapter.open(request), (handle) =>
          Effect.orDie(adapter.destroy(handle))
        );
      }).pipe(
        Effect.withSpan("SandboxProvider.open", {
          attributes: { provider: request.provider },
        }),
        Effect.annotateLogs({ provider: request.provider })
      );

    const attach = (provider: ProviderName, id: string) =>
      Effect.gen(function* () {
        const adapter = yield* adapters.resolve(provider);
        return yield* adapter.attach(id);
      }).pipe(
        Effect.withSpan("SandboxProvider.attach", {
          attributes: { provider, sandboxId: id },
        })
      );

    return SandboxProvider.of({ attach, open });
  })
);
