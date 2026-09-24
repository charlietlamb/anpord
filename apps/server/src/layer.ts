import { AuthLive } from "@anpord/auth";
import { AuthConfigLive } from "@anpord/auth/config";
import { OrganizationStoreLive } from "@anpord/auth/organization";
import { BillingLive } from "@anpord/billing/layer";
import { CacheConfigLive } from "@anpord/cache/config";
import { CacheLive } from "@anpord/cache/layer";
import { DatabaseLive } from "@anpord/db/client";
import { DatabaseConfigLive } from "@anpord/db/config";
import { TrialRunnerTrigger } from "@anpord/eval/adapters/runner/trigger";
import { GithubRepositoriesLive } from "@anpord/eval/codebase/github-repositories";
import { CredentialCipherLive } from "@anpord/eval/credentials/cipher";
import { CredentialConnectionsLive } from "@anpord/eval/credentials/connections";
import { DeviceAuthLive } from "@anpord/eval/credentials/device-auth";
import {
  EvalCodebaseLive,
  EvalCredentialsLive,
  EvalSweepsLive,
  evalStackWith,
} from "@anpord/eval/layer";
import { layer as ModelCatalogueLive } from "@anpord/eval/services/model-catalogue";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { EmailSenderLive } from "@anpord/notifications/email/layer";
import { PromptsLayer } from "@anpord/prompts/layer";
import { FetchHttpClient } from "@effect/platform";
import { BunContext } from "@effect/platform-bun";
import { Layer } from "effect";
import { ServerConfigLive } from "./config";
import { VerifiedKeysLive } from "./http/authentication/verified-keys";
import { TelemetryLive } from "./telemetry";

const DatabaseLayer = DatabaseLive.pipe(Layer.provide(DatabaseConfigLive));
const CacheLayer = CacheLive.pipe(Layer.provide(CacheConfigLive));

const OrganizationLayer = OrganizationStoreLive.pipe(
  Layer.provide(Layer.mergeAll(DatabaseLayer, IdGeneratorLive, BillingLive))
);

const AuthLayer = AuthLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      AuthConfigLive,
      DatabaseLayer,
      IdGeneratorLive,
      OrganizationLayer,
      EmailSenderLive,
      BillingLive
    )
  )
);

const PromptsServiceLayer = PromptsLayer.pipe(
  Layer.provide(Layer.mergeAll(DatabaseLayer, CacheLayer))
);

const VerifiedKeysLayer = VerifiedKeysLive.pipe(Layer.provide(AuthLayer));

const CredentialDependencies = Layer.mergeAll(
  CredentialCipherLive,
  DatabaseLayer,
  IdGeneratorLive
);
const CredentialConnectionsLayer = CredentialConnectionsLive.pipe(
  Layer.provide(CredentialDependencies)
);
const CredentialLayer = Layer.mergeAll(
  CredentialConnectionsLayer,
  EvalCredentialsLive.pipe(Layer.provide(DatabaseLayer)),
  DeviceAuthLive.pipe(
    Layer.provide(CredentialConnectionsLayer),
    Layer.provide(CredentialDependencies)
  )
);

const CodebaseLayer = Layer.mergeAll(
  EvalCodebaseLive,
  GithubRepositoriesLive.pipe(Layer.provide(FetchHttpClient.layer))
).pipe(Layer.provide(DatabaseLayer));

const EvalLayer = Layer.mergeAll(
  evalStackWith(TrialRunnerTrigger),
  EvalSweepsLive,
  ModelCatalogueLive.pipe(
    Layer.provide(Layer.merge(BunContext.layer, FetchHttpClient.layer))
  )
).pipe(Layer.provide(DatabaseLayer));

export const AppLayer = Layer.mergeAll(
  AuthConfigLive,
  ServerConfigLive,
  TelemetryLive,
  AuthLayer,
  VerifiedKeysLayer,
  OrganizationLayer,
  DatabaseLayer,
  PromptsServiceLayer,
  CredentialLayer,
  CodebaseLayer,
  EvalLayer,
  /* Merged so the signup hook and the eval routes read the same meter. */
  BillingLive
);
