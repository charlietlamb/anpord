import type { Actor } from "@anpord/schema/domain/actor";
import type { ResolvedCredential } from "@anpord/schema/domain/credentials";
import { Context, type Effect, type Redacted } from "effect";
import type { CredentialError } from "./errors";

export interface ResolveCredential {
  readonly actor: Actor;
  readonly connectionId?: string;
  readonly integrationId: string;
}

/* No actor: a person authorised this connection when the run was started. Still
   scoped to the organization, so a run cannot reach another's credential. */
export interface BoundCredential {
  readonly connectionId: string;
  readonly organizationId: string;
}

export interface PersistCredential {
  readonly connectionId: string;
  readonly organizationId: string;
  readonly values: Readonly<Record<string, string>>;
}

export interface CredentialResolverShape {
  /* A harness that refreshes its own token leaves the stored copy spent, so
     the rotated material has to be written back before the sandbox goes. */
  readonly persist: (
    input: PersistCredential
  ) => Effect.Effect<void, CredentialError>;
  readonly resolve: (
    input: ResolveCredential
  ) => Effect.Effect<Redacted.Redacted<ResolvedCredential>, CredentialError>;
  readonly resolveBound: (
    input: BoundCredential
  ) => Effect.Effect<Redacted.Redacted<ResolvedCredential>, CredentialError>;
}

export class CredentialResolver extends Context.Tag(
  "@anpord/eval/CredentialResolver"
)<CredentialResolver, CredentialResolverShape>() {}
