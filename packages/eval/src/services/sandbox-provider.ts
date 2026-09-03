import { Config, Effect, Layer } from "effect";
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
        }),
        Effect.annotateLogs({ provider, sandboxId: id })
      );

    const destroy = (input: DestroySandbox) =>
      Effect.gen(function* () {
        const adapter = yield* adapters.resolve(
          input.provider,
          input.credentials
        );
        yield* adapter.destroy({ id: input.id });
      }).pipe(
        Effect.withSpan("SandboxProvider.destroy", {
          attributes: { provider: input.provider, sandboxId: input.id },
        }),
        Effect.annotateLogs({ provider: input.provider, sandboxId: input.id })
      );

    return SandboxProvider.of({ attach, destroy, open });
  })
);
