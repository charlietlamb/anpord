import type { Actor } from "@sphynx/schema/domain/actor";
import type {
  CredentialBindings,
  ResolvedCredential,
} from "@sphynx/schema/domain/credentials";
import { Effect, Option, Redacted } from "effect";
import type { HarnessName, SandboxName } from "../domain/variant";
import { ownerOf } from "../environment/variable-repository";
import { variablesRef } from "./credential-ref";
import type { CredentialError } from "./errors";
import type { CredentialResolverShape } from "./resolver";

export interface BindVariant {
  readonly credentials?: CredentialBindings;
  readonly harness: HarnessName;
  readonly sandbox: SandboxName;
}

export interface BoundCredentials {
  readonly harnessCredentialRef: string | null;
  readonly harnessCredentialRevision: number | null;
  readonly sandboxCredentialRef: string | null;
  readonly sandboxCredentialRevision: number | null;
}

export const KEYLESS_HARNESSES: ReadonlySet<HarnessName> = new Set(["command"]);

const optional = (
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

const bindingOf = (credential: Redacted.Redacted<ResolvedCredential>) => {
  const value = Redacted.value(credential);
  return value.revision === 0
    ? { ref: null, revision: null }
    : { ref: value.connectionId, revision: value.revision };
};

export const bindCredentials = (
  resolver: CredentialResolverShape,
  actor: Actor,
  variants: readonly BindVariant[]
) =>
  Effect.forEach(variants, (variant) =>
    Effect.gen(function* () {
      const harness = KEYLESS_HARNESSES.has(variant.harness)
        ? { ref: variablesRef(ownerOf(actor)), revision: null }
        : bindingOf(
            yield* resolver.resolve({
              actor,
              credentialRef: variant.credentials?.harnessRef,
              integrationId: variant.harness,
            })
          );

      const sandbox = Option.match(
        yield* optional(
          resolver.resolve({
            actor,
            credentialRef: variant.credentials?.sandboxRef,
            integrationId: variant.sandbox,
          }),
          variant.credentials?.sandboxRef
        ),
        {
          onNone: () => ({ ref: null, revision: null }),
          onSome: bindingOf,
        }
      );

      return {
        harnessCredentialRef: harness.ref,
        harnessCredentialRevision: harness.revision,
        sandboxCredentialRef: sandbox.ref,
        sandboxCredentialRevision: sandbox.revision,
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
    authMethodId: "none",
    connectionId: "none",
    integrationId: "none",
    revision: 0,
    values: {},
  });
