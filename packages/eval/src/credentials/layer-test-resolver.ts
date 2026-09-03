import type { CredentialValues } from "@anpord/schema/domain/credentials";
import { Effect, Layer, Redacted } from "effect";
import { CredentialResolver } from "./resolver";

export const layerTestResolver = (
  values: CredentialValues = {}
): Layer.Layer<CredentialResolver> =>
  Layer.succeed(
    CredentialResolver,
    CredentialResolver.of({
      resolve: (input) =>
        Effect.succeed(
          Redacted.make({
            authMethodId: "test",
            connectionId: input.connectionId ?? "test",
            integrationId: input.integrationId,
            revision: 1,
            values,
          })
        ),
      resolveBound: (input) =>
        Effect.succeed(
          Redacted.make({
            authMethodId: "test",
            connectionId: input.connectionId,
            integrationId: "test",
            revision: 1,
            values,
          })
        ),
    })
  );
