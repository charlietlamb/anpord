import { Effect, Layer } from "effect";
import { connectionNotFound } from "../../src/credentials/errors";
import { CredentialResolver } from "../../src/credentials/resolver";

export const nothingConnected = Layer.succeed(CredentialResolver, {
  persist: () => Effect.void,
  resolve: () => Effect.fail(connectionNotFound()),
  resolveBound: () => Effect.fail(connectionNotFound()),
});
