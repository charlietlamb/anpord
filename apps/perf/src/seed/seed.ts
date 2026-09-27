import type { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import type { StartedBatch } from "@anpord/schema/domain/evals";
import { mapLimit } from "../concurrency";
import { callV1 } from "../stack/api";
import type { PerfTenant } from "../stack/tenant";
import { journal, outcome, trialUsage } from "./journal";
import { LARGE_SUITE, type SeedPlan, suiteRequest } from "./plan";
import { seeded } from "./random";

const SEED_CONCURRENCY = 12;
const JOURNAL_EPOCH = Date.UTC(2026, 8, 1);

interface SeededRun {
  readonly caseId: string;
  readonly id: string;
}

interface SeededBatch {
  readonly id: string;
  readonly runs: readonly SeededRun[];
}

interface LargeTrial {
  readonly batchId: string;
  readonly caseId: string;
  readonly runId: string;
  readonly trialId: string;
}

export interface SeededWorld {
  readonly batches: readonly SeededBatch[];
  readonly cases: readonly string[];
  readonly large: LargeTrial;
  readonly prompts: readonly string[];
  readonly suites: readonly string[];
}

interface RunWithTrials {
  readonly trials: readonly { readonly id: string }[];
}

const call = <Body>(
  baseUrl: string,
  tenant: PerfTenant,
  endpoint: string,
  payload: unknown
) => callV1<Body>(baseUrl, tenant.apiKey, endpoint, payload);

const reportTrial = (
  baseUrl: string,
  tenant: PerfTenant,
  runId: string,
  ordinal: number,
  seed: number,
  events: number
) => {
  const random = seeded(seed);
  const written = journal(random, events, JOURNAL_EPOCH + seed);
  return call(baseUrl, tenant, "runner.report", {
    events: written,
    ordinal,
    outcome: outcome(random, written),
    runId,
    sandboxId: `perf-sandbox-${seed}`,
    usage: trialUsage(random),
  });
};

const runBatch = async (
  baseUrl: string,
  tenant: PerfTenant,
  request: StartBatchRequest,
  seed: number,
  events: number
): Promise<SeededBatch> => {
  const started = await call<StartedBatch>(
    baseUrl,
    tenant,
    "runner.start",
    request
  );
  const trials = started.runs.flatMap((run, runIndex) =>
    Array.from({ length: request.trials }, (_, index) => ({
      ordinal: index + 1,
      run,
      seed: seed + runIndex * 16 + index,
    }))
  );
  await mapLimit(trials, SEED_CONCURRENCY, (trial) =>
    reportTrial(
      baseUrl,
      tenant,
      trial.run.id,
      trial.ordinal,
      trial.seed,
      events
    )
  );
  await call(baseUrl, tenant, "runner.finish", { id: started.id });
  return {
    id: started.id,
    runs: started.runs.map((run) => ({ caseId: run.caseId, id: run.id })),
  };
};

const seedPrompts = (baseUrl: string, tenant: PerfTenant, count: number) =>
  mapLimit(
    Array.from({ length: count }, (_, index) => `perf-prompt-${index}`),
    SEED_CONCURRENCY,
    async (id) => {
      await call(baseUrl, tenant, "prompts.create", {
        content: `You are reviewing {{language}} code for ${id}. Be concise.`,
        id,
        name: id,
      });
      return id;
    }
  );

export const seedWorld = async (
  baseUrl: string,
  tenant: PerfTenant,
  plan: SeedPlan,
  template: StartBatchRequest
): Promise<SeededWorld> => {
  const suites = Array.from(
    { length: plan.suites },
    (_, index) => `perf-s${index}`
  );
  const jobs = suites.flatMap((suite, suiteIndex) =>
    Array.from({ length: plan.batchesPerSuite }, (_, batchIndex) => ({
      request: suiteRequest(
        template,
        suite,
        plan.casesPerSuite,
        plan.variants,
        plan.trials
      ),
      seed:
        plan.seed + (suiteIndex * plan.batchesPerSuite + batchIndex) * 100_000,
    }))
  );

  const batches: SeededBatch[] = [];
  for (const job of jobs) {
    batches.push(
      await runBatch(
        baseUrl,
        tenant,
        job.request,
        job.seed,
        plan.eventsPerTrial
      )
    );
  }

  const largeBatch = await runBatch(
    baseUrl,
    tenant,
    suiteRequest(template, LARGE_SUITE, 1, 1, 1),
    plan.seed - 1,
    plan.largeJournalEvents
  );
  const [largeRun] = largeBatch.runs;
  if (largeRun === undefined) {
    throw new Error("The large journal batch started no run.");
  }
  const run = await call<RunWithTrials>(baseUrl, tenant, "evals.runs.get", {
    id: largeRun.id,
  });

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
      trialId: run.trials[0]?.id ?? "",
    },
    prompts: await seedPrompts(baseUrl, tenant, plan.prompts),
    suites,
  };
};
