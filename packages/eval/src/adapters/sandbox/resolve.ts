import { Effect, Layer, Record, Redacted } from "effect";
import type { ProviderName } from "../../domain/cell";
import { SandboxAdapters } from "../../ports/sandbox";
import { cloudflareAdapter } from "./cloudflare";
import { daytonaAdapter } from "./daytona";
import { e2bAdapter } from "./e2b";
import { makeLocalAdapter } from "./local";
import { modalAdapter } from "./modal";
import type { MakeAdapter } from "./provider-adapter";
import { upstashAdapter } from "./upstash";
import { vercelAdapter } from "./vercel";

const SANDBOX_ADAPTERS: { readonly [provider in ProviderName]: MakeAdapter } = {
  cloudflare: cloudflareAdapter,
  daytona: daytonaAdapter,
  e2b: e2bAdapter,
  local: () => makeLocalAdapter,
  modal: modalAdapter,
  upstash: upstashAdapter,
  vercel: vercelAdapter,
};

export const SandboxAdaptersLive = Layer.effect(
  SandboxAdapters,
  Effect.gen(function* () {
    const defaults = yield* Effect.all(
      Record.map(SANDBOX_ADAPTERS, (make) => Effect.cached(make()))
    );

    return SandboxAdapters.of({
      resolve: (provider, credentials) =>
        (credentials === undefined
          ? defaults[provider]
          : SANDBOX_ADAPTERS[provider](Redacted.value(credentials))
        ).pipe(
          Effect.withSpan("SandboxAdapters.resolve", {
            attributes: { provider },
          }),
          Effect.annotateLogs({ provider })
        ),
    });
  })
);
