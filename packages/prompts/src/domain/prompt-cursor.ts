import {
  PromptId,
  PromptName,
  type PromptSortOrder,
} from "@anpord/schema/domain/prompts";
import { Effect, ParseResult, Schema } from "effect";
import type { PromptListRow } from "../repositories/prompt-list-query";
import { InvalidCursor } from "./errors";

/** The cursor carries the key of the sort that issued it, so a client that
 * changes sort while holding an old cursor is rejected rather than paged
 * against a predicate the key does not belong to. */
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

/** The cursor must carry the key the active sort pages on, or the next page is
 * compared against a column the ordering does not use. */
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

/** Decoded through the schema rather than cast, so a tampered cursor is
 * rejected here instead of reaching the query as an arbitrary id. */
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
