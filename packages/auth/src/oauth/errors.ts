import { Data } from "effect";

export class OAuthClientNotFound extends Data.TaggedError(
  "OAuthClientNotFound"
)<{ readonly clientId: string }> {}

export class OAuthClientUnreadable extends Data.TaggedError(
  "OAuthClientUnreadable"
)<{ readonly cause: unknown }> {}
