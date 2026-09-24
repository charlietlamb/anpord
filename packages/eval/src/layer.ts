import { IdGeneratorLive } from "@anpord/ids/layer";
import { FetchHttpClient } from "@effect/platform";
import { Layer } from "effect";
import type { ConfigError } from "effect/ConfigError";
import { HarnessesLive } from "./adapters/harness/resolve";
import { ModelPricesLive } from "./adapters/models/prices";
import { SandboxAdaptersLive } from "./adapters/sandbox/resolve";
import { ScorerChecksLive } from "./adapters/scorers/checks";
import { ScorerGroundTruthLive } from "./adapters/scorers/ground-truth";
import { SimulatedUserLive } from "./adapters/user/llm-user";
import { BatchesLive } from "./batch/batches";
import { GithubAppConfigLive, GithubAppLive } from "./codebase/github-app";
import { InstallationsLive } from "./codebase/installations";
import { SourceTokensLive } from "./codebase/source-token";
import { CredentialCipherLive } from "./credentials/cipher";
import { CredentialResolverLive } from "./credentials/resolver-live";
import { JudgeModelLive } from "./judges/layer";
import { type RunBell, RunBellSilent } from "./ports/run-bell";
import type { TrialRunner } from "./ports/trial-runner";
import { AbandonedWorkLive } from "./repositories/abandoned-work";
import { BatchRepositoryLive } from "./repositories/batch-repository";
import { CatalogRepositoryLive } from "./repositories/catalog-repository";
import { EventRepositoryLive } from "./repositories/event-repository";
import { ExpiredRowsLive } from "./repositories/expired-rows";
import { HarnessProfileRepositoryLive } from "./repositories/harness-profile-repository";
import { JournalArchiveLive } from "./repositories/journal-archive";
import { LiveSandboxesLive } from "./repositories/live-sandboxes";
import { TrialCostRepositoryLive } from "./repositories/trial-cost-repository";
import { TrialRecorderLive } from "./repositories/trial-record";
import { AgentTrialLive } from "./services/agent-trial";
import { EvalReadsLive } from "./services/eval-reads";
import { ExpirySweepScheduleLive } from "./services/expiry-sweep";
import { HarnessVersionsLive } from "./services/harness-versions";
import { JournalRetentionScheduleLive } from "./services/journal-retention";
import { AgentTrialJudgedLive } from "./services/judged-trial";
import { ReconcilerScheduleLive } from "./services/reconciler";
import { SandboxProviderLive } from "./services/sandbox-provider";
import { SandboxReaperScheduleLive } from "./services/sandbox-reaper";
import { type Suspender, SuspenderSleeping } from "./services/suspender";

const HttpLive = FetchHttpClient.layer;

export const EvalCredentialsLive = CredentialResolverLive.pipe(
  Layer.provide(Layer.merge(CredentialCipherLive, IdGeneratorLive))
);

export const EvalCodebaseLive = SourceTokensLive.pipe(
  Layer.provideMerge(InstallationsLive),
  Layer.provideMerge(GithubAppLive.pipe(Layer.provide(GithubAppConfigLive)))
);

export const EvalSandboxLive = SandboxProviderLive.pipe(
  Layer.provide(SandboxAdaptersLive)
);

const RepositoriesLive = Layer.mergeAll(
  BatchRepositoryLive,
  CatalogRepositoryLive,
  EventRepositoryLive,
  HarnessProfileRepositoryLive,
  TrialCostRepositoryLive,
  TrialRecorderLive
).pipe(Layer.provide(IdGeneratorLive), Layer.provide(JournalArchiveLive));

const agentWith = (suspender: Layer.Layer<Suspender>) =>
  AgentTrialJudgedLive.pipe(
    Layer.provide(
      AgentTrialLive.pipe(
        Layer.provide(
          ScorerChecksLive.pipe(Layer.provide(ScorerGroundTruthLive))
        ),
        Layer.provide(suspender)
      )
    ),
    Layer.provide(JudgeModelLive),
    Layer.provide(HarnessesLive)
  );

export const evalStackWith = (
  runner: Layer.Layer<TrialRunner, ConfigError>,
  {
    bell = RunBellSilent,
    suspender = SuspenderSleeping,
  }: {
    readonly bell?: Layer.Layer<RunBell>;
    readonly suspender?: Layer.Layer<Suspender>;
  } = {}
) =>
  Layer.mergeAll(BatchesLive, EvalReadsLive).pipe(
    Layer.provide(agentWith(suspender)),
    Layer.provide(
      Layer.mergeAll(runner, bell, ModelPricesLive, SimulatedUserLive)
    ),
    Layer.provide(EvalSandboxLive),
    Layer.provideMerge(RepositoriesLive),
    Layer.provideMerge(HarnessVersionsLive),
    Layer.provideMerge(EvalCodebaseLive),
    Layer.provideMerge(EvalCredentialsLive),
    Layer.provide(HttpLive)
  );

export const EvalSweepsLive = Layer.mergeAll(
  ReconcilerScheduleLive.pipe(Layer.provide(AbandonedWorkLive)),
  JournalRetentionScheduleLive.pipe(Layer.provide(JournalArchiveLive)),
  ExpirySweepScheduleLive.pipe(Layer.provide(ExpiredRowsLive)),
  SandboxReaperScheduleLive.pipe(
    Layer.provide(LiveSandboxesLive),
    Layer.provide(EvalSandboxLive),
    Layer.provide(EvalCredentialsLive)
  )
);
