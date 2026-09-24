import { createHash } from "node:crypto";
import { Database } from "@anpord/db/client";
import { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrialArtifact } from "@anpord/db/schema/evals/eval-trial-artifacts";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import type { EvalArtifactRequest } from "@anpord/schema/domain/evals";
import { and, eq } from "drizzle-orm";
import { Effect, Option } from "effect";
import { tryStore } from "./query";

export const trialArtifactQuery = Effect.gen(function* () {
  const db = yield* Database;

  return (organizationId: string, input: EvalArtifactRequest) =>
    tryStore("trialArtifact.find", () =>
      db
        .select({
          content: evalTrialArtifact.content,
          metadata: evalTrial.artifacts,
        })
        .from(evalTrial)
        .innerJoin(
          evalTrialArtifact,
          and(
            eq(evalTrialArtifact.trialInternalId, evalTrial.internalId),
            eq(evalTrialArtifact.sha256, input.sha256),
            eq(evalTrialArtifact.path, input.path)
          )
        )
        .innerJoin(evalRun, eq(evalRun.internalId, evalTrial.runInternalId))
        .innerJoin(evalBatch, eq(evalBatch.internalId, evalRun.batchInternalId))
        .where(
          and(
            eq(evalBatch.organizationId, organizationId),
            eq(evalTrial.internalId, input.trialId)
          )
        )
        .limit(1)
    ).pipe(
      Effect.map((rows) => {
        const row = rows[0];
        const artifact = row?.metadata?.find(
          (file) => file.sha256 === input.sha256
        );
        return row === undefined ||
          artifact === undefined ||
          createHash("sha256").update(row.content).digest("hex") !==
            artifact.sha256
          ? Option.none()
          : Option.some({ ...artifact, content: row.content });
      }),
      Effect.withSpan("TrialArtifactQuery.find")
    );
});
