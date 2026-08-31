import { DatabaseLive } from "@anpord/db/client";
import { DatabaseConfigLive } from "@anpord/db/config";
import {
  GithubAppConfigLive,
  GithubAppLive,
} from "@anpord/eval/codebase/github-app";
import { InstallationsLive } from "@anpord/eval/codebase/installations";
import { SourceTokensLive } from "@anpord/eval/codebase/source-token";
import { CredentialCipherLive } from "@anpord/eval/credentials/cipher";
import { CredentialResolverLive } from "@anpord/eval/credentials/connections";
import {
  EvalGridLive,
  EvalHarnessVersionsLive,
  EvalSandboxLive,
} from "@anpord/eval/layer";
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
export const WorkerLayer = EvalGridLive.pipe(
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
