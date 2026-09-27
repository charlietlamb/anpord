import { describe, expect, it } from "bun:test";
import { ConfigProvider, Effect, Redacted } from "effect";
import {
  CredentialCipher,
  CredentialCipherLive,
} from "../../src/credentials/cipher";

const run = <A>(
  effect: Effect.Effect<A, unknown, CredentialCipher>,
  key = "test-key"
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(CredentialCipherLive),
      Effect.withConfigProvider(
        ConfigProvider.fromMap(new Map([["CREDENTIALS_ENCRYPTION_KEY", key]]))
      )
    )
  );

describe("CredentialCipher", () => {
  it("round trips without exposing plaintext", async () => {
    const result = await run(
      Effect.gen(function* () {
        const cipher = yield* CredentialCipher;
        const sealed = yield* cipher.seal(Redacted.make("secret"), "context");
        const opened = yield* cipher.open(sealed, "context");
        return { opened: Redacted.value(opened), sealed };
      })
    );

    expect(result.opened).toBe("secret");
    expect(result.sealed).not.toContain("secret");
  });

  it("binds ciphertext to its context", async () => {
    const result = await run(
      Effect.gen(function* () {
        const cipher = yield* CredentialCipher;
        const sealed = yield* cipher.seal(Redacted.make("secret"), "one");
        return yield* Effect.either(cipher.open(sealed, "two"));
      })
    );

    expect(result._tag).toBe("Left");
  });

  it("reports a payload sealed under another key as undecryptable", async () => {
    const sealed = await run(
      CredentialCipher.pipe(
        Effect.flatMap((cipher) =>
          cipher.seal(Redacted.make("secret"), "context")
        )
      ),
      "another-key"
    );
    const opened = await run(
      CredentialCipher.pipe(
        Effect.flatMap((cipher) => Effect.flip(cipher.open(sealed, "context")))
      )
    );

    expect({ code: opened.code, message: opened.message }).toEqual({
      code: "undecryptable",
      message: "Credential could not be decrypted",
    });
  });
});
