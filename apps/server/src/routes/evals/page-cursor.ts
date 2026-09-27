import type { EvalPageCursor } from "@anpord/schema/domain/evals";

export const cursorOf = (params: {
  readonly cursorId?: string | undefined;
  readonly cursorStartedAt?: number | undefined;
}): EvalPageCursor | null =>
  params.cursorId === undefined || params.cursorStartedAt === undefined
    ? null
    : { id: params.cursorId, startedAtMillis: params.cursorStartedAt };
