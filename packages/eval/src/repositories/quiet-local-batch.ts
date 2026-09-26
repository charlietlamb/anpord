import { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import { and, eq, isNotNull, lt, type SQL } from "drizzle-orm";

export const quietLocalBatch = (since: Date) =>
  and(
    eq(evalBatch.local, true),
    isNotNull(evalBatch.lastSeenAt),
    lt(evalBatch.lastSeenAt, since)
  ) as SQL;
