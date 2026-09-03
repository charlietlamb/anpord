import { Effect } from "effect";
import { CredentialError } from "./errors";
import { credentialMethod } from "./integrations";

const ENV_KEY = /^[A-Z_][A-Z0-9_]*$/;

const invalid = (message: string) =>
  Effect.fail(new CredentialError({ message }));

/* Declared fields cannot describe an env map: the customer names the keys.
   Validated as a whole before any field projection, which would otherwise
   reduce every map to nothing. */
const validateEnv = (values: Readonly<Record<string, string>>) => {
  const entries = Object.entries(values).map(
    ([key, value]) => [key, value.trim()] as const
  );

  if (entries.length === 0) {
    return invalid("At least one variable is required");
  }

  const badKey = entries.find(([key]) => !ENV_KEY.test(key));

  if (badKey !== undefined) {
    return invalid(`${badKey[0]} is not a valid variable name`);
  }

  const blank = entries.find(([, value]) => value === "");

  if (blank !== undefined) {
    return invalid(`${blank[0]} has no value`);
  }

  return Effect.succeed(Object.fromEntries(entries));
};

export const validateCredential = (
  integrationId: string,
  methodId: string,
  values: Readonly<Record<string, string>>
) =>
  Effect.gen(function* () {
    const { method } = yield* credentialMethod(integrationId, methodId);

    if (method.kind === "env") {
      return yield* validateEnv(values);
    }

    const missing = method.fields.find(
      (item) => item.required && !values[item.name]?.trim()
    );

    if (missing !== undefined) {
      return yield* invalid(`${missing.label} is required`);
    }

    if (method.kind === "device") {
      const authJson = values.authJson?.trim();
      return authJson
        ? { authJson }
        : yield* invalid("Device authentication is incomplete");
    }

    return Object.fromEntries(
      method.fields.flatMap((item) => {
        const value = values[item.name]?.trim();
        return value ? [[item.name, value]] : [];
      })
    );
  });
