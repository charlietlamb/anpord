import { Effect, Layer, Redacted } from "effect";
import { CredentialError } from "./errors";
import { CredentialResolver } from "./resolver";

/* Credentials for a run on the operator's own machine: the environment is the
   connection, so there is nothing stored to look up, rotate, or write back. */
const resolved = (integrationId: string) =>
  Redacted.make({
    authMethodId: "env",
    connectionId: "local",
    integrationId,
    /* Zero means unstored, which is what stops a rotation being written back. */
    revision: 0,
    values: Object.fromEntries(
      Object.entries(process.env).flatMap(([name, value]) =>
        value === undefined ? [] : [[name, value] as const]
      )
    ),
  });

export const CredentialResolverFromEnv = Layer.succeed(
  CredentialResolver,
  CredentialResolver.of({
    /* A harness that rotated its token rotated one this machine already owns. */
    persist: () => Effect.void,
    resolve: ({ integrationId }) => Effect.succeed(resolved(integrationId)),
    resolveBound: ({ connectionId }) =>
      Effect.fail(
        new CredentialError({
          code: "not-found",
          message: `a local run has no stored connection, so ${connectionId} cannot be read`,
        })
      ),
  })
);
