import type { CredentialValues } from "@anpord/schema/domain/credentials";
import { Effect, Layer, Redacted } from "effect";
import type { ProviderName } from "../../domain/cell";
import { type SandboxAdapterShape, SandboxAdapters } from "../../ports/sandbox";
import {
  makeCloudflareAdapter,
  makeConfiguredCloudflareAdapter,
} from "./cloudflare";
import { makeConfiguredDaytonaAdapter, makeDaytonaAdapter } from "./daytona";
import { makeConfiguredE2BAdapter, makeE2BAdapter } from "./e2b";
import { makeConfiguredModalAdapter, makeModalAdapter } from "./modal";
import { makeConfiguredUpstashAdapter, makeUpstashAdapter } from "./upstash";
import { makeConfiguredVercelAdapter, makeVercelAdapter } from "./vercel";

export const SandboxAdaptersLive = Layer.effect(
  SandboxAdapters,
  Effect.gen(function* () {
    const builders: Record<ProviderName, Effect.Effect<SandboxAdapterShape>> = {
      cloudflare: yield* Effect.cached(makeCloudflareAdapter),
      daytona: yield* Effect.cached(makeDaytonaAdapter),
      e2b: yield* Effect.cached(makeE2BAdapter),
      upstash: yield* Effect.cached(makeUpstashAdapter),
      modal: yield* Effect.cached(makeModalAdapter),
      vercel: yield* Effect.cached(makeVercelAdapter),
    };

    const configured = (
      provider: ProviderName,
      credentials: Redacted.Redacted<CredentialValues>
    ) => {
      const make = {
        cloudflare: makeConfiguredCloudflareAdapter,
        daytona: makeConfiguredDaytonaAdapter,
        e2b: makeConfiguredE2BAdapter,
        modal: makeConfiguredModalAdapter,
        upstash: makeConfiguredUpstashAdapter,
        vercel: makeConfiguredVercelAdapter,
      }[provider];
      return make(Redacted.value(credentials));
    };

    return SandboxAdapters.of({
      resolve: (provider, credentials) =>
        (credentials === undefined
          ? builders[provider]
          : configured(provider, credentials)
        ).pipe(
          Effect.withSpan("SandboxAdapters.resolve", {
            attributes: { provider },
          }),
          Effect.annotateLogs({ provider })
        ),
    });
  })
);
