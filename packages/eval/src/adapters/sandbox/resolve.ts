import type { CredentialValues } from "@anpord/schema/domain/credentials";
import { HttpClient } from "@effect/platform";
import { Effect, Layer, Record, Redacted } from "effect";
import type { SandboxName } from "../../domain/variant";
import { SandboxAdapters } from "../../ports/sandbox";
import { cloudflareAdapter } from "./cloudflare";
import { daytonaAdapter } from "./daytona";
import { e2bAdapter } from "./e2b";
import { makeLocalAdapter } from "./local";
import { modalAdapter } from "./modal";
import type { MakeAdapter } from "./provider-adapter";
import { upstashAdapter } from "./upstash";
import { vercelAdapter } from "./vercel";

const withClient =
  (client: HttpClient.HttpClient) => (values?: CredentialValues) =>
    cloudflareAdapter(values).pipe(
      Effect.provideService(HttpClient.HttpClient, client)
    );

const adaptersWith = (
  client: HttpClient.HttpClient
): { readonly [provider in SandboxName]: MakeAdapter } => ({
  cloudflare: withClient(client),
  daytona: daytonaAdapter,
  e2b: e2bAdapter,
  local: () => makeLocalAdapter,
  modal: modalAdapter,
  upstash: upstashAdapter,
  vercel: vercelAdapter,
});

export const SandboxAdaptersLive = Layer.effect(
  SandboxAdapters,
  Effect.gen(function* () {
    const adapters = adaptersWith(yield* HttpClient.HttpClient);
    const defaults = yield* Effect.all(
      Record.map(adapters, (make) => Effect.cached(make()))
    );

    return SandboxAdapters.of({
      resolve: (provider, credentials) =>
        (credentials === undefined
          ? defaults[provider]
          : adapters[provider](Redacted.value(credentials))
        ).pipe(
          Effect.withSpan("SandboxAdapters.resolve", {
            attributes: { provider },
          }),
          Effect.annotateLogs({ provider })
        ),
    });
  })
);
