import { Effect, Layer } from "effect";
import type { ProviderName } from "../domain/cell";
import { type SandboxAdapterShape, SandboxAdapters } from "../ports/sandbox";
import { makeDaytonaAdapter } from "./daytona";
import { makeE2BAdapter } from "./e2b";

/** The only place a provider name becomes an implementation. Adding Modal is a
 * new adapter file and one entry here; nothing above this line changes. */
export const SandboxAdaptersLive = Layer.effect(
  SandboxAdapters,
  Effect.gen(function* () {
    const adapters: Record<ProviderName, SandboxAdapterShape> = {
      daytona: yield* makeDaytonaAdapter,
      e2b: yield* makeE2BAdapter,
    };

    return SandboxAdapters.of({ resolve: (provider) => adapters[provider] });
  })
);
