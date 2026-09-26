import { Effect, Layer, Redacted } from "effect";
import { CredentialError } from "./errors";
import { CredentialResolver } from "./resolver";
import { KEYLESS_HARNESSES } from "./variants";

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

const answering = (
  valuesFor: (
    integrationId: string
  ) => Effect.Effect<Readonly<Record<string, string>>, CredentialError>
) =>
  Layer.succeed(
    CredentialResolver,
    CredentialResolver.of({
      persist: () => Effect.void,
      resolve: ({ integrationId }) =>
        Effect.map(valuesFor(integrationId), (values) =>
          resolved(integrationId, values)
        ),
      resolveBound: ({ connectionId }) =>
        Effect.fail(
          new CredentialError({
            code: "not-found",
            message: `a local run has no stored connection, so ${connectionId} cannot be read`,
          })
        ),
    })
  );

export const credentialResolverFrom = (
  leases: ReadonlyMap<string, Readonly<Record<string, string>>>
) =>
  answering((integrationId) => {
    if ([...KEYLESS_HARNESSES].some((harness) => harness === integrationId)) {
      return Effect.succeed({});
    }
    const values = leases.get(integrationId);
    return values === undefined
      ? Effect.fail(
          new CredentialError({
            code: "not-found",
            message: `this run holds credentials for ${[...leases.keys()].join(", ")}, not one for ${integrationId}`,
          })
        )
      : Effect.succeed(values);
  });

export const CredentialResolverFromEnv = Layer.suspend(() => {
  const values = environment();
  return answering(() => Effect.succeed(values));
});
