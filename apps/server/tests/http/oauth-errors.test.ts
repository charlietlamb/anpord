import { describe, expect, test } from "bun:test";
import {
  OAuthClientNotFound,
  OAuthClientUnreadable,
} from "@anpord/auth/oauth/errors";
import { Effect } from "effect";
import { withOAuthErrors } from "../../src/http/oauth-errors";

const mapped = (error: OAuthClientNotFound | OAuthClientUnreadable) =>
  Effect.runPromise(Effect.flip(withOAuthErrors(Effect.fail(error))));

describe("withOAuthErrors", () => {
  test("an unknown client is a 404 with the message the consent screen shows", async () => {
    const error = await mapped(new OAuthClientNotFound({ clientId: "x" }));

    expect({ _tag: error._tag, message: error.message }).toEqual({
      _tag: "NotFound",
      message: "No such client",
    });
  });

  test("a failed read is an internal error", async () => {
    const error = await mapped(new OAuthClientUnreadable({ cause: "down" }));

    expect({ _tag: error._tag, message: error.message }).toEqual({
      _tag: "InternalError",
      message: "Could not read the client",
    });
  });
});
