import { DatabaseLive } from "@anpord/db/client";
import { DatabaseConfigLive } from "@anpord/db/config";
import { TrialRunnerTrigger } from "@anpord/eval/adapters/runner/trigger";
import { SuspenderTrigger } from "@anpord/eval/adapters/runner/trigger-suspender";
import {
  GithubAppConfigLive,
  GithubAppLive,
} from "@anpord/eval/codebase/github-app";
import { InstallationsLive } from "@anpord/eval/codebase/installations";
import { SourceTokensLive } from "@anpord/eval/codebase/source-token";
import { CredentialCipherLive } from "@anpord/eval/credentials/cipher";
import { CredentialResolverLive } from "@anpord/eval/credentials/resolver";
import {
  EvalHarnessVersionsLive,
  EvalSandboxLive,
  evalGridWith,
  SandboxReaperSweepLive,
} from "@anpord/eval/layer";
import { TrialRunnerInProcess } from "@anpord/eval/ports/trial-runner";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { Layer } from "effect";

const DatabaseLayer = DatabaseLive.pipe(Layer.provide(DatabaseConfigLive));

const CredentialDependencies = Layer.mergeAll(
  CredentialCipherLive,
  DatabaseLayer,
  IdGeneratorLive
);

const CodebaseLayer = Layer.mergeAll(
  InstallationsLive.pipe(Layer.provide(DatabaseLayer)),
  GithubAppLive.pipe(Layer.provide(GithubAppConfigLive)),
  SourceTokensLive.pipe(
    Layer.provide(InstallationsLive.pipe(Layer.provide(DatabaseLayer))),
    Layer.provide(GithubAppLive.pipe(Layer.provide(GithubAppConfigLive)))
  )
);

/* In-process runner because a dispatched run arrives here; handing it on again would be a task dispatching to itself. The suspender is Trigger's, because a wait held here is a wait billed here. */
const GridLayer = evalGridWith(TrialRunnerInProcess, SuspenderTrigger).pipe(
  Layer.provide(EvalSandboxLive),
  /* Merged, not provided: the task yields the resolver itself to resolve a stored run's credentials. */
  Layer.provideMerge(
    CredentialResolverLive.pipe(Layer.provide(CredentialDependencies))
  ),
  Layer.provide(EvalHarnessVersionsLive),
  Layer.provide(CodebaseLayer),
  Layer.provide(Layer.mergeAll(DatabaseLayer, IdGeneratorLive))
);

/* Swept here as well as in the api: a worker that dies mid-trial leaves a VM its scope finalizer never reached. Both sweeps are idempotent, so whichever process reaches a row first reaps it. */
const ReaperLayer = SandboxReaperSweepLive.pipe(
  Layer.provide(EvalSandboxLive),
  Layer.provide(
    CredentialResolverLive.pipe(Layer.provide(CredentialDependencies))
  ),
  Layer.provide(DatabaseLayer)
);

export const WorkerLayer = Layer.mergeAll(GridLayer, ReaperLayer);

/* The same stack, handing runs to Trigger rather than running them here. */
export const DispatchingLayer = evalGridWith(TrialRunnerTrigger).pipe(
  Layer.provide(EvalSandboxLive),
  Layer.provideMerge(
    CredentialResolverLive.pipe(Layer.provide(CredentialDependencies))
  ),
  Layer.provide(EvalHarnessVersionsLive),
  Layer.provide(CodebaseLayer),
  Layer.provide(Layer.mergeAll(DatabaseLayer, IdGeneratorLive))
);
