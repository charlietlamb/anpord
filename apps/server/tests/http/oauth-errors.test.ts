import { describe, expect, test } from "bun:test";
import {
  OAuthClientNotFound,
  OAuthClientUnreadable,
} from "@sphynx/auth/oauth/errors";
import { Effect, Logger } from "effect";
import { withOAuthErrors } from "../../src/http/oauth-errors";

const mapped = async (error: OAuthClientNotFound | OAuthClientUnreadable) => {
  const logged: unknown[] = [];
  const capture = Logger.replace(
    Logger.defaultLogger,
    Logger.make(({ message }) => {
      logged.push(message);
    })
  );
  const failure = await Effect.runPromise(
    Effect.flip(withOAuthErrors(Effect.fail(error))).pipe(
      Effect.provide(capture)
    )
  );
  return { failure, logged };
};

describe("withOAuthErrors", () => {
  test("an unknown client is a 404 with the message the consent screen shows and logs nothing", async () => {
    const { failure, logged } = await mapped(
      new OAuthClientNotFound({ clientId: "x" })
    );

    expect({
      _tag: failure._tag,
      logged,
      message: failure.message,
    }).toEqual({
      _tag: "NotFound",
      logged: [],
      message: "No such client",
    });
  });

  test("a failed read is an internal error that logs its cause", async () => {
    const { failure, logged } = await mapped(
      new OAuthClientUnreadable({ cause: "down" })
    );

    expect({
      _tag: failure._tag,
      logged,
      message: failure.message,
    }).toEqual({
      _tag: "InternalError",
      logged: [["Could not read the OAuth client", "down"]],
      message: "Could not read the client",
    });
  });
});
