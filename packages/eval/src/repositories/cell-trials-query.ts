import { Database } from "@anpord/db/client";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { inArray } from "drizzle-orm";
import { Effect } from "effect";
import { tryStore } from "./query";

type TrialRow = typeof evalTrial.$inferSelect;

export const cellTrialsQuery = Effect.map(
  Database,
  (db) => (cellIds: readonly string[]) =>
    cellIds.length === 0
      ? Effect.succeed([] as readonly TrialRow[])
      : tryStore("runQuery.trials", () =>
          db
            .select()
            .from(evalTrial)
            .where(inArray(evalTrial.cellInternalId, [...cellIds]))
        )
);
