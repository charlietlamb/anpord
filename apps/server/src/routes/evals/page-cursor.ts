import type { EvalPageCursor } from "@sphynx/schema/domain/eval-read-models";

export const cursorOf = (params: {
  readonly cursorId?: string | undefined;
  readonly cursorStartedAt?: number | undefined;
}): EvalPageCursor | null =>
  params.cursorId === undefined || params.cursorStartedAt === undefined
    ? null
    : { id: params.cursorId, startedAtMillis: params.cursorStartedAt };
