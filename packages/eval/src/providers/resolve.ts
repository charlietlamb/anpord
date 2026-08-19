import { Effect, Layer } from "effect";
import type { ProviderName } from "../domain/cell";
import { type SandboxAdapterShape, SandboxAdapters } from "../ports/sandbox";
import { makeDaytonaAdapter } from "./daytona";
import { makeE2BAdapter } from "./e2b";

const builders: Record<ProviderName, Effect.Effect<SandboxAdapterShape>> = {
  daytona: makeDaytonaAdapter,
  e2b: makeE2BAdapter,
};

/**
 * The only place a provider name becomes an implementation. Adding Modal is a
 * new adapter file and one entry here; nothing above this line changes.
 *
 * Adapters are built on first use and then cached, because each vendor's SDK
 * reads its own credentials at construction. Building all of them eagerly
 * would make a run against one provider require a key for every other.
 */
export const SandboxAdaptersLive = Layer.sync(SandboxAdapters, () => {
  const built = new Map<ProviderName, SandboxAdapterShape>();

  return SandboxAdapters.of({
    resolve: (provider) => {
      const existing = built.get(provider);

      if (existing !== undefined) {
        return existing;
      }

      const adapter = Effect.runSync(builders[provider]);
      built.set(provider, adapter);

      return adapter;
    },
  });
});
