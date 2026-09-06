import {
  PromptId,
  PromptName,
  type PromptSortOrder,
} from "@anpord/schema/domain/prompts";
import { Effect, ParseResult, Schema } from "effect";
import type { PromptListRow } from "../repositories/prompt-list-query";
import { InvalidCursor } from "./errors";

/* The cursor names the sort that issued it, so changing sort mid-page is
   rejected rather than paged against the wrong predicate. */
export const PromptCursorPayload = Schema.Union(
  Schema.Struct({
    id: PromptId,
    sort: Schema.Literal("updated"),
    updatedAt: Schema.Number,
  }),
  Schema.Struct({
    id: PromptId,
    name: PromptName,
    sort: Schema.Literal("name"),
  })
);
export type PromptCursorPayload = typeof PromptCursorPayload.Type;

const decodePayload = Schema.decodeUnknown(PromptCursorPayload);

const toBase64Url = (value: string) =>
  btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

const fromBase64Url = (value: string) =>
  atob(value.replaceAll("-", "+").replaceAll("_", "/"));

export const encodePromptCursor = (cursor: PromptCursorPayload): string =>
  toBase64Url(JSON.stringify(cursor));

export const cursorFor = (
  row: PromptListRow,
  sort: PromptSortOrder
): PromptCursorPayload =>
  sort === "name"
    ? {
        id: PromptId.make(row.id),
        name: PromptName.make(row.name),
        sort: "name",
      }
    : {
        id: PromptId.make(row.id),
        sort: "updated",
        updatedAt: row.updatedAt.getTime(),
      };

/* Decoded, not cast, so a tampered cursor is rejected before it reaches the
   query as an arbitrary id. */
export const decodePromptCursor = (
  encoded: string,
  sort: PromptSortOrder
): Effect.Effect<PromptCursorPayload, InvalidCursor> =>
  Effect.suspend(() =>
    Effect.try({
      try: () => JSON.parse(fromBase64Url(encoded)) as unknown,
      catch: () => new InvalidCursor({ cursor: encoded }),
    })
  ).pipe(
    Effect.flatMap(decodePayload),
    Effect.catchIf(
      ParseResult.isParseError,
      () => new InvalidCursor({ cursor: encoded })
    ),
    Effect.filterOrFail(
      (payload) => payload.sort === sort,
      () => new InvalidCursor({ cursor: encoded })
    )
  );
