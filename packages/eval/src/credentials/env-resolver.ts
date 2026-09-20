import { Effect, Layer, Redacted } from "effect";
import { CredentialError } from "./errors";
import { CredentialResolver } from "./resolver";

const environment = (): Readonly<Record<string, string>> =>
  Object.fromEntries(
    Object.entries(process.env).flatMap(([name, value]) =>
      value === undefined ? [] : [[name, value] as const]
    )
  );

const resolved = (
  integrationId: string,
  values: Readonly<Record<string, string>>
) =>
  Redacted.make({
    authMethodId: "env",
    connectionId: "local",
    integrationId,
    revision: 0,
    values,
  });

export const credentialResolverFrom = (
  values: Readonly<Record<string, string>>
) =>
  Layer.succeed(
    CredentialResolver,
    CredentialResolver.of({
      persist: () => Effect.void,
      resolve: ({ integrationId }) =>
        Effect.succeed(resolved(integrationId, values)),
      resolveBound: ({ connectionId }) =>
        Effect.fail(
          new CredentialError({
            code: "not-found",
            message: `a local run has no stored connection, so ${connectionId} cannot be read`,
          })
        ),
    })
  );

export const CredentialResolverFromEnv = Layer.suspend(() =>
  credentialResolverFrom(environment())
);
