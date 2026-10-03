import type { Actor } from "@sphynx/schema/domain/actor";
import type { ResolvedCredential } from "@sphynx/schema/domain/credentials";
import { Context, type Effect, type Redacted } from "effect";
import type { CredentialError } from "./errors";

export interface ResolveCredential {
  readonly actor: Actor;
  readonly credentialRef?: string;
  readonly integrationId: string;
}

export interface BoundCredential {
  readonly credentialRef: string;
  readonly integrationId: string;
  readonly organizationId: string;
}

export interface BoundVariables {
  readonly credentialRef: string;
  readonly names: readonly string[];
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
  readonly variables: (
    input: BoundVariables
  ) => Effect.Effect<
    Redacted.Redacted<Readonly<Record<string, string>>>,
    CredentialError
  >;
}

export class CredentialResolver extends Context.Tag(
  "@sphynx/eval/CredentialResolver"
)<CredentialResolver, CredentialResolverShape>() {}
