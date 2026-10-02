import { EvalReads } from "@sphynx/eval/services/eval-reads";
import type { EvalPageCursor } from "@sphynx/schema/domain/eval-read-models";
import type { EvalTailMark } from "@sphynx/schema/domain/eval-tail";
import { Effect } from "effect";
import { withEvalErrors } from "../../http/eval-errors";
import { organization } from "./current-organization";

export const readBatch = (batchId: string) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).batch(yield* organization, batchId);
  }).pipe(withEvalErrors);

export const listBatches = (
  cursor: EvalPageCursor | null,
  limit: number | undefined
) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).batches({
      cursor,
      limit,
      organizationId: yield* organization,
    });
  });

export const readTail = (batchId: string, after: readonly EvalTailMark[]) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).tail({
      after,
      batchId,
      organizationId: yield* organization,
    });
  }).pipe(withEvalErrors);
