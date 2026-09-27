import type { CredentialValues } from "@anpord/schema/domain/credentials";
import { HttpClient } from "@effect/platform";
import { Effect, Layer, Record, Redacted } from "effect";
import type { SandboxName } from "../../domain/variant";
import { SandboxAdapters } from "../../ports/sandbox";
import { cloudflareAdapter } from "./cloudflare";
import { makeLocalAdapter } from "./local";
import type { MakeAdapter } from "./provider-adapter";

const loaded =
  (load: () => Promise<MakeAdapter>): MakeAdapter =>
  (values) =>
    Effect.flatMap(Effect.promise(load), (make) => make(values));

const withClient =
  (client: HttpClient.HttpClient) => (values?: CredentialValues) =>
    cloudflareAdapter(values).pipe(
      Effect.provideService(HttpClient.HttpClient, client)
    );

const adaptersWith = (
  client: HttpClient.HttpClient
): { readonly [provider in SandboxName]: MakeAdapter } => ({
  cloudflare: withClient(client),
  daytona: loaded(() =>
    import("./daytona").then((module) => module.daytonaAdapter)
  ),
  e2b: loaded(() => import("./e2b").then((module) => module.e2bAdapter)),
  local: () => makeLocalAdapter,
  modal: loaded(() => import("./modal").then((module) => module.modalAdapter)),
  upstash: loaded(() =>
    import("./upstash").then((module) => module.upstashAdapter)
  ),
  vercel: loaded(() =>
    import("./vercel").then((module) => module.vercelAdapter)
  ),
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
