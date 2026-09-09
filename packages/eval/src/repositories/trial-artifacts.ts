import { createHash } from "node:crypto";
import { Database } from "@anpord/db/client";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrialArtifact } from "@anpord/db/schema/evals/eval-trial-artifacts";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { NotFound } from "@anpord/schema/domain/errors";
import type { EvalArtifactRequest } from "@anpord/schema/domain/evals";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";

/* Scope the trial through its owning run before returning file bytes. */
export const getEvalArtifact = (
  organizationId: string,
  input: EvalArtifactRequest
) =>
  Effect.gen(function* () {
    const db = yield* Database;
    const rows = yield* Effect.promise(() =>
      db
        .select({
          metadata: evalTrial.artifacts,
          content: evalTrialArtifact.content,
        })
        .from(evalTrial)
        .innerJoin(
          evalTrialArtifact,
          and(
            eq(evalTrialArtifact.trialInternalId, evalTrial.internalId),
            and(
              eq(evalTrialArtifact.sha256, input.sha256),
              eq(evalTrialArtifact.path, input.path)
            )
          )
        )
        .innerJoin(evalCell, eq(evalCell.internalId, evalTrial.cellInternalId))
        .innerJoin(evalRun, eq(evalRun.internalId, evalCell.runInternalId))
        .where(
          and(
            eq(evalRun.organizationId, organizationId),
            eq(evalRun.id, input.id),
            eq(evalCell.cellKey, input.cellKey),
            eq(evalTrial.ordinal, input.ordinal)
          )
        )
        .limit(1)
    );
    const artifact = rows[0]?.metadata?.find(
      (file) => file.sha256 === input.sha256
    );
    if (!artifact) {
      return yield* Effect.fail(
        new NotFound({ message: "Output file not found" })
      );
    }
    const content = rows[0]?.content;
    if (
      content === undefined ||
      createHash("sha256").update(content).digest("hex") !== artifact.sha256
    ) {
      return yield* Effect.fail(
        new NotFound({ message: "Output file not found" })
      );
    }
    return { ...artifact, content };
  });
