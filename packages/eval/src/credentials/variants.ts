import type { Actor } from "@anpord/schema/domain/actor";
import type {
  CredentialBindings,
  ResolvedCredential,
} from "@anpord/schema/domain/credentials";
import { Effect, Option, Redacted } from "effect";
import type { HarnessName, ProviderName } from "../domain/cell";
import { CredentialError } from "./errors";
import type { CredentialResolverShape } from "./resolver";

export interface BindVariant {
  readonly credentials?: CredentialBindings;
  readonly harness: HarnessName;
  readonly sandbox: ProviderName;
}

export interface BoundCredentials {
  readonly harnessCredentialConnectionId: string | null;
  readonly harnessCredentialRevision: number | null;
  readonly sandboxCredentialConnectionId: string | null;
  readonly sandboxCredentialRevision: number | null;
}

export const KEYLESS_HARNESSES: ReadonlySet<HarnessName> = new Set([
  "command",
]);

const found = (
  effect: Effect.Effect<Redacted.Redacted<ResolvedCredential>, CredentialError>,
  explicit: string | undefined
) =>
  effect.pipe(
    Effect.map(Option.some),
    Effect.catchIf(
      (error) => explicit === undefined && error.code === "not-found",
      () => Effect.succeedNone
    )
  );

const bindingOf = (credential: Option.Option<Redacted.Redacted<ResolvedCredential>>) =>
  Option.match(credential, {
    onNone: () => ({ connectionId: null, revision: null }),
    onSome: (resolved) => {
      const value = Redacted.value(resolved);
      return value.revision === 0
        ? { connectionId: null, revision: null }
        : { connectionId: value.connectionId, revision: value.revision };
    },
  });

export const bindCredentials = (
  resolver: CredentialResolverShape,
  actor: Actor,
  variants: readonly BindVariant[]
) =>
  Effect.forEach(variants, (variant) =>
    Effect.gen(function* () {
      const harnessIn = (integrationId: string) =>
        resolver.resolve({
          actor,
          connectionId: variant.credentials?.harnessConnectionId,
          integrationId,
        });
      const harness = yield* found(
        harnessIn(variant.harness).pipe(
          Effect.catchIf(
            (error) => error.code === "not-found",
            () => harnessIn("env")
          )
        ),
        variant.credentials?.harnessConnectionId
      );

      if (Option.isNone(harness) && !KEYLESS_HARNESSES.has(variant.harness)) {
        return yield* new CredentialError({
          code: "not-found",
          message: `No credential configured for ${variant.harness}`,
        });
      }

      const sandbox = yield* found(
        resolver.resolve({
          actor,
          connectionId: variant.credentials?.sandboxConnectionId,
          integrationId: variant.sandbox,
        }),
        variant.credentials?.sandboxConnectionId
      );

      const harnessBinding = bindingOf(harness);
      const sandboxBinding = bindingOf(sandbox);

      return {
        harnessCredentialConnectionId: harnessBinding.connectionId,
        harnessCredentialRevision: harnessBinding.revision,
        sandboxCredentialConnectionId: sandboxBinding.connectionId,
        sandboxCredentialRevision: sandboxBinding.revision,
      } satisfies BoundCredentials;
    })
  ).pipe(
    Effect.withSpan("EvalCredentials.bind", {
      attributes: { variants: variants.length },
    }),
    Effect.annotateLogs({ organizationId: actor.organizationId })
  );

export const unkeyed = () =>
  Redacted.make<ResolvedCredential>({
    authMethodId: "env",
    connectionId: "env-none",
    integrationId: "env",
    revision: 0,
    values: {},
  });
