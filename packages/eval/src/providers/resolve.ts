import { Effect, Layer } from "effect";
import type { ProviderName } from "../domain/cell";
import { type SandboxAdapterShape, SandboxAdapters } from "../ports/sandbox";
import { makeDaytonaAdapter } from "./daytona";
import { makeE2BAdapter } from "./e2b";

/**
 * The only place a provider name becomes an implementation. Adding Modal is a
 * new adapter file and one entry here; nothing above this line changes.
 *
 * Adapters are built once, on first use, because each vendor's SDK reads its
 * own credentials at construction and building them all eagerly would make a
 * run against one provider need a key for every other. `Effect.cached` owns
 * the memo rather than a Map behind `runSync`: trials fan out concurrently, so
 * a hand-rolled cache can miss and construct a second client, and escaping the
 * runtime would die rather than fail the moment a builder needs `Config`.
 */
export const SandboxAdaptersLive = Layer.effect(
  SandboxAdapters,
  Effect.gen(function* () {
    const builders: Record<ProviderName, Effect.Effect<SandboxAdapterShape>> = {
      daytona: yield* Effect.cached(makeDaytonaAdapter),
      e2b: yield* Effect.cached(makeE2BAdapter),
    };

    return SandboxAdapters.of({ resolve: (provider) => builders[provider] });
  })
);
