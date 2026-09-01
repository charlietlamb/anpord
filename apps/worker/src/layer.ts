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
import { CredentialResolverLive } from "@anpord/eval/credentials/connections";
import {
  EvalHarnessVersionsLive,
  EvalSandboxLive,
  evalGridWith,
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

/* The eval stack without the http and auth around it: a worker is handed a run
   id and executes it, so it needs the grid and what the grid reaches, and
   nothing that serves a request. */
/* The runner is in-process because this is where a dispatched run arrives:
   handing it on again would be a task dispatching to itself. The suspender is
   Trigger's, because a wait held here is a wait billed here, and a prepare
   waits for most of its life. */
export const WorkerLayer = evalGridWith(
  TrialRunnerInProcess,
  SuspenderTrigger
).pipe(
  Layer.provide(EvalSandboxLive),
  /* Merged rather than provided: the task resolves the credentials a stored
     run recorded, so it yields the resolver itself. */
  Layer.provideMerge(
    CredentialResolverLive.pipe(Layer.provide(CredentialDependencies))
  ),
  Layer.provide(EvalHarnessVersionsLive),
  Layer.provide(CodebaseLayer),
  Layer.provide(Layer.mergeAll(DatabaseLayer, IdGeneratorLive))
);

/* The same stack, handing runs to Trigger rather than running them here. What
   the api composes, and what a smoke test needs in order to exercise the
   dispatch rather than stand in for it. */
export const DispatchingLayer = evalGridWith(TrialRunnerTrigger).pipe(
  Layer.provide(EvalSandboxLive),
  Layer.provideMerge(
    CredentialResolverLive.pipe(Layer.provide(CredentialDependencies))
  ),
  Layer.provide(EvalHarnessVersionsLive),
  Layer.provide(CodebaseLayer),
  Layer.provide(Layer.mergeAll(DatabaseLayer, IdGeneratorLive))
);
