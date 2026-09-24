import type { Actor } from "@anpord/schema/domain/actor";
import type { ResolvedCredential } from "@anpord/schema/domain/credentials";
import { Context, type Effect, type Redacted } from "effect";
import type { CredentialError } from "./errors";

export interface ResolveCredential {
  readonly actor: Actor;
  readonly connectionId?: string;
  readonly integrationId: string;
}

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
