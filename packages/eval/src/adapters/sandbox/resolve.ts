import { Effect, Layer } from "effect";
import type { ProviderName } from "../../domain/cell";
import { type SandboxAdapterShape, SandboxAdapters } from "../../ports/sandbox";
import { makeDaytonaAdapter } from "./daytona";
import { makeE2BAdapter } from "./e2b";
import { makeLocalAdapter } from "./local";

/** Built on first use, because each vendor's SDK reads its credentials at
 * construction: eager building would make one provider need every key. */
export const SandboxAdaptersLive = Layer.effect(
  SandboxAdapters,
  Effect.gen(function* () {
    const builders: Record<ProviderName, Effect.Effect<SandboxAdapterShape>> = {
      daytona: yield* Effect.cached(makeDaytonaAdapter),
      e2b: yield* Effect.cached(makeE2BAdapter),
      local: yield* Effect.cached(makeLocalAdapter),
    };

    return SandboxAdapters.of({ resolve: (provider) => builders[provider] });
  })
);
