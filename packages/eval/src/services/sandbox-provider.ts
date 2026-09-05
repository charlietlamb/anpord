import { Config, Duration, Effect, Layer, Schedule } from "effect";
import type { ProviderName } from "../domain/cell";
import {
  type DestroySandbox,
  type OpenSandbox,
  SandboxAdapters,
  SandboxProvider,
} from "../ports/sandbox";

const concurrencyConfig = Config.all({
  cloudflare: Config.integer("EVAL_CLOUDFLARE_CONCURRENCY").pipe(
    Config.withDefault(5)
  ),
  daytona: Config.integer("EVAL_DAYTONA_CONCURRENCY").pipe(
    Config.withDefault(5)
  ),
  e2b: Config.integer("EVAL_E2B_CONCURRENCY").pipe(Config.withDefault(5)),
  upstash: Config.integer("EVAL_UPSTASH_CONCURRENCY").pipe(
    Config.withDefault(5)
  ),
  modal: Config.integer("EVAL_MODAL_CONCURRENCY").pipe(Config.withDefault(5)),
  vercel: Config.integer("EVAL_VERCEL_CONCURRENCY").pipe(Config.withDefault(5)),
});

/* A teardown that gives up on the first refusal leaks the VM for good: the
   scope is closing, so nothing tries again and the id goes out of scope with
   it. Bounded rather than open-ended, because the reaper is the backstop and
   a release that never returns holds the permit the next trial is waiting
   for. */
const TEARDOWN = Schedule.exponential(Duration.seconds(1)).pipe(
  Schedule.compose(Schedule.recurs(4))
);

export const SandboxProviderLive = Layer.effect(
  SandboxProvider,
  Effect.gen(function* () {
    const adapters = yield* SandboxAdapters;
    const concurrency = yield* concurrencyConfig;

    const permits: Record<ProviderName, Effect.Semaphore> = {
      cloudflare: yield* Effect.makeSemaphore(concurrency.cloudflare),
      daytona: yield* Effect.makeSemaphore(concurrency.daytona),
      e2b: yield* Effect.makeSemaphore(concurrency.e2b),
      upstash: yield* Effect.makeSemaphore(concurrency.upstash),
      modal: yield* Effect.makeSemaphore(concurrency.modal),
      vercel: yield* Effect.makeSemaphore(concurrency.vercel),
    };

    const open = (request: OpenSandbox) =>
      Effect.gen(function* () {
        const limit = permits[request.provider];

        yield* limit.take(1);
        yield* Effect.addFinalizer(() => limit.release(1));

        const adapter = yield* adapters.resolve(
          request.provider,
          request.credentials
        );

        return yield* Effect.acquireRelease(adapter.open(request), (handle) =>
          adapter.destroy(handle).pipe(Effect.retry(TEARDOWN), Effect.orDie)
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
        }),
        Effect.annotateLogs({ provider, sandboxId: id })
      );

    const destroy = (input: DestroySandbox) =>
      Effect.gen(function* () {
        const adapter = yield* adapters.resolve(
          input.provider,
          input.credentials
        );
        yield* adapter.destroy({ id: input.id }).pipe(Effect.retry(TEARDOWN));
      }).pipe(
        Effect.withSpan("SandboxProvider.destroy", {
          attributes: { provider: input.provider, sandboxId: input.id },
        }),
        Effect.annotateLogs({ provider: input.provider, sandboxId: input.id })
      );

    return SandboxProvider.of({ attach, destroy, open });
  })
);
