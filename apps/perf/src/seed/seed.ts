import type { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import type { StartedBatch } from "@anpord/schema/domain/evals";
import { mapLimit } from "../concurrency";
import type { CallV1 } from "../stack/api";
import { JOURNAL_EPOCH, trialReport } from "./journal";
import {
  assertPlanFits,
  LARGE_SUITE,
  type SeedPlan,
  suiteRequest,
} from "./plan";
import { seeded } from "./random";

const SEED_CONCURRENCY = 12;

interface SeededBatch {
  readonly id: string;
  readonly runs: readonly { readonly caseId: string; readonly id: string }[];
}

export interface SeededWorld {
  readonly batches: readonly SeededBatch[];
  readonly cases: readonly string[];
  readonly large: {
    readonly batchId: string;
    readonly caseId: string;
    readonly runId: string;
    readonly trialId: string;
  };
  readonly prompts: readonly string[];
}

const runBatch = async (
  call: CallV1,
  request: StartBatchRequest,
  seed: number,
  events: number
): Promise<SeededBatch> => {
  const started = await call<StartedBatch>("runner.start", request);
  const trials = started.runs.flatMap((run, runIndex) =>
    Array.from({ length: request.trials }, (_, index) => ({
      ordinal: index + 1,
      runId: run.id,
      seed: seed + runIndex * 16 + index,
    }))
  );
  await mapLimit(trials, SEED_CONCURRENCY, (trial) =>
    call(
      "runner.report",
      trialReport(
        seeded(trial.seed),
        events,
        JOURNAL_EPOCH + trial.seed,
        trial,
        `perf-sandbox-${trial.seed}`
      )
    )
  );
  await call("runner.finish", { id: started.id });
  return {
    id: started.id,
    runs: started.runs.map((run) => ({ caseId: run.caseId, id: run.id })),
  };
};

export const seedWorld = async (
  call: CallV1,
  plan: SeedPlan,
  template: StartBatchRequest
): Promise<SeededWorld> => {
  assertPlanFits(plan);
  const batches: SeededBatch[] = [];
  for (let suite = 0; suite < plan.suites; suite += 1) {
    for (let batch = 0; batch < plan.batchesPerSuite; batch += 1) {
      batches.push(
        await runBatch(
          call,
          suiteRequest(
            template,
            `perf-s${suite}`,
            plan.casesPerSuite,
            plan.variants,
            plan.trials
          ),
          plan.seed + (suite * plan.batchesPerSuite + batch) * 100_000,
          plan.eventsPerTrial
        )
      );
    }
  }

  const largeBatch = await runBatch(
    call,
    suiteRequest(template, LARGE_SUITE, 1, 1, 1),
    plan.seed - 1,
    plan.largeJournalEvents
  );
  const [largeRun] = largeBatch.runs;
  if (largeRun === undefined) {
    throw new Error("The large journal batch started no run.");
  }
  const run = await call<{ readonly trials: readonly { id: string }[] }>(
    "evals.runs.get",
    { id: largeRun.id }
  );
  const [largeTrial] = run.trials;
  if (largeTrial === undefined) {
    throw new Error("The large journal run recorded no trial.");
  }

  return {
    batches,
    cases: [
      ...new Set(
        batches.flatMap((batch) => batch.runs.map((each) => each.caseId))
      ),
    ],
    large: {
      batchId: largeBatch.id,
      caseId: largeRun.caseId,
      runId: largeRun.id,
      trialId: largeTrial.id,
    },
    prompts: await mapLimit(
      Array.from(
        { length: plan.prompts },
        (_, index) => `perf-prompt-${index}`
      ),
      SEED_CONCURRENCY,
      async (id) => {
        await call("prompts.create", {
          content: `You are reviewing {{language}} code for ${id}. Be concise.`,
          id,
          name: id,
        });
        return id;
      }
    ),
  };
};
