import { Effect, ParseResult, Schema } from "effect";
import { InvalidCursor } from "./errors";

const toBase64Url = (value: string) =>
  btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

const fromBase64Url = (value: string) =>
  atob(value.replaceAll("-", "+").replaceAll("_", "/"));

export const encodeCursor = (cursor: object): string =>
  toBase64Url(JSON.stringify(cursor));

/* Decoded, not cast, so a tampered cursor is rejected before it reaches the
   query as an arbitrary id. */
export const decodeCursor = <A, I>(
  schema: Schema.Schema<A, I>,
  encoded: string
): Effect.Effect<A, InvalidCursor> =>
  Effect.suspend(() =>
    Effect.try({
      try: () => JSON.parse(fromBase64Url(encoded)) as unknown,
      catch: () => new InvalidCursor({ cursor: encoded }),
    })
  ).pipe(
    Effect.flatMap(Schema.decodeUnknown(schema)),
    Effect.catchIf(
      ParseResult.isParseError,
      () => new InvalidCursor({ cursor: encoded })
    )
  );
