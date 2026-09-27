import { Config, Context, Effect, Layer, Redacted } from "effect";
import { deriveEnvelopeKey, openEnvelope, sealEnvelope } from "./envelope";
import { CredentialError } from "./errors";

export interface CredentialCipherShape {
  readonly open: (
    sealed: string,
    context: string
  ) => Effect.Effect<Redacted.Redacted<string>, CredentialError>;
  readonly seal: (
    value: Redacted.Redacted<string>,
    context: string
  ) => Effect.Effect<string, CredentialError>;
}

export class CredentialCipher extends Context.Tag(
  "@anpord/eval/CredentialCipher"
)<CredentialCipher, CredentialCipherShape>() {}

export const keyConfig = Config.redacted("CREDENTIALS_ENCRYPTION_KEY").pipe(
  Config.orElse(() => Config.redacted("BETTER_AUTH_SECRET"))
);

export const resolveEncryptionSecret = () =>
  Effect.runPromise(keyConfig).then(Redacted.value);

export const CredentialCipherLive = Layer.effect(
  CredentialCipher,
  Effect.gen(function* () {
    const secret = yield* keyConfig;
    const key = yield* Effect.promise(() =>
      deriveEnvelopeKey(Redacted.value(secret))
    );

    return CredentialCipher.of({
      open: (sealed, context) =>
        Effect.tryPromise({
          catch: () =>
            new CredentialError({
              code: "undecryptable",
              message: "Credential could not be decrypted",
            }),
          try: async () =>
            Redacted.make(await openEnvelope(key, sealed, context)),
        }).pipe(
          Effect.withSpan("CredentialCipher.open"),
          Effect.annotateLogs({ method: "open" })
        ),
      seal: (value, context) =>
        Effect.tryPromise({
          catch: () =>
            new CredentialError({
              code: "internal",
              message: "Credential could not be encrypted",
            }),
          try: () => sealEnvelope(key, Redacted.value(value), context),
        }).pipe(
          Effect.withSpan("CredentialCipher.seal"),
          Effect.annotateLogs({ method: "seal" })
        ),
    });
  })
);
