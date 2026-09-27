import { describe, expect, it } from "bun:test";
import { CredentialError } from "@anpord/eval/credentials/errors";
import { Effect } from "effect";
import { withCredentialErrors } from "../../src/http/credential-errors";

const answer = (error: CredentialError) =>
  Effect.runPromise(Effect.flip(withCredentialErrors(Effect.fail(error))));

describe("withCredentialErrors", () => {
  it("answers an undecryptable credential as an internal error without its detail", async () => {
    const answered = await answer(
      new CredentialError({
        code: "undecryptable",
        message: "Credential could not be decrypted",
      })
    );

    expect({ message: answered.message, tag: answered._tag }).toEqual({
      message: "Credential operation failed",
      tag: "InternalError",
    });
  });
});
