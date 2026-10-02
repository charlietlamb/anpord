import {
  PromptId,
  PromptName,
  type PromptSortOrder,
} from "@sphynx/schema/domain/prompts";
import { Effect, Schema } from "effect";
import type { PromptListRow } from "../repositories/prompt-list-query";
import { decodeCursor } from "./cursor-codec";
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

export const decodePromptCursor = (
  encoded: string,
  sort: PromptSortOrder
): Effect.Effect<PromptCursorPayload, InvalidCursor> =>
  decodeCursor(PromptCursorPayload, encoded).pipe(
    Effect.filterOrFail(
      (payload) => payload.sort === sort,
      () => new InvalidCursor({ cursor: encoded })
    )
  );
