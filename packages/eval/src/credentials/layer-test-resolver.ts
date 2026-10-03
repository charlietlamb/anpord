import type { CredentialValues } from "@sphynx/schema/domain/credentials";
import { Effect, Layer, Redacted } from "effect";
import { CredentialResolver } from "./resolver";

export const layerTestResolver = (
  values: CredentialValues = {}
): Layer.Layer<CredentialResolver> =>
  Layer.succeed(
    CredentialResolver,
    CredentialResolver.of({
      persist: () => Effect.void,
      resolve: (input) =>
        Effect.succeed(
          Redacted.make({
            authMethodId: "test",
            connectionId: input.credentialRef ?? "test",
            integrationId: input.integrationId,
            revision: 1,
            values,
          })
        ),
      resolveBound: (input) =>
        Effect.succeed(
          Redacted.make({
            authMethodId: "test",
            connectionId: input.credentialRef,
            integrationId: input.integrationId,
            revision: 1,
            values,
          })
        ),
      variables: (input) =>
        Effect.succeed(
          Redacted.make(
            Object.fromEntries(
              input.names.map((name) => [name, values[name] ?? ""])
            )
          )
        ),
    })
  );
