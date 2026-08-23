import { Config, Context, Effect, Layer, Redacted } from "effect";
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

const keyConfig = Config.redacted("CREDENTIALS_ENCRYPTION_KEY").pipe(
  Config.orElse(() => Config.redacted("BETTER_AUTH_SECRET"))
);

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const encode = (value: Uint8Array) => Buffer.from(value).toString("base64url");
const decode = (value: string) =>
  Uint8Array.from(Buffer.from(value, "base64url"));

export const CredentialCipherLive = Layer.effect(
  CredentialCipher,
  Effect.gen(function* () {
    const secret = yield* keyConfig;
    const key = yield* Effect.promise(async () =>
      crypto.subtle.importKey(
        "raw",
        await crypto.subtle.digest(
          "SHA-256",
          encoder.encode(Redacted.value(secret))
        ),
        "AES-GCM",
        false,
        ["encrypt", "decrypt"]
      )
    );

    return CredentialCipher.of({
      open: (sealed, context) =>
        Effect.tryPromise({
          catch: () =>
            new CredentialError({
              code: "internal",
              message: "Credential could not be decrypted",
            }),
          try: async () => {
            const [version, iv, encrypted] = sealed.split(".");
            if (version !== "v1" || !iv || !encrypted) {
              throw new Error("Invalid envelope");
            }
            const value = await crypto.subtle.decrypt(
              {
                additionalData: encoder.encode(context),
                iv: decode(iv),
                name: "AES-GCM",
              },
              key,
              decode(encrypted)
            );
            return Redacted.make(decoder.decode(value));
          },
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
          try: async () => {
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await crypto.subtle.encrypt(
              {
                additionalData: encoder.encode(context),
                iv,
                name: "AES-GCM",
              },
              key,
              encoder.encode(Redacted.value(value))
            );
            return ["v1", encode(iv), encode(new Uint8Array(encrypted))].join(
              "."
            );
          },
        }).pipe(
          Effect.withSpan("CredentialCipher.seal"),
          Effect.annotateLogs({ method: "seal" })
        ),
    });
  })
);
