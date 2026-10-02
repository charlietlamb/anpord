import { FetchHttpClient } from "@effect/platform";
import { BunContext } from "@effect/platform-bun";
import { AuthLive } from "@sphynx/auth";
import { AuthConfigLive } from "@sphynx/auth/config";
import { OAuthClientsLive } from "@sphynx/auth/oauth/oauth-clients";
import { OrganizationStoreLive } from "@sphynx/auth/organization";
import { BillingLive } from "@sphynx/billing/layer";
import { CacheConfigLive } from "@sphynx/cache/config";
import { CacheLive } from "@sphynx/cache/layer";
import { DatabaseLive } from "@sphynx/db/client";
import { DatabaseConfigLive } from "@sphynx/db/config";
import { TrialRunnerTrigger } from "@sphynx/eval/adapters/runner/trigger";
import { BatchSubscriptionsTrigger } from "@sphynx/eval/adapters/runner/trigger-subscriptions";
import { CodebaseConnectionLive } from "@sphynx/eval/codebase/codebase-connection";
import { GithubRepositoriesLive } from "@sphynx/eval/codebase/github-repositories";
import { CredentialCipherLive } from "@sphynx/eval/credentials/cipher";
import { CredentialConnectionsLive } from "@sphynx/eval/credentials/connections";
import { DeviceAuthLive } from "@sphynx/eval/credentials/device-auth";
import {
  EvalCodebaseLive,
  EvalCredentialsLive,
  EvalSweepsLive,
  evalStackWith,
} from "@sphynx/eval/layer";
import { layer as ModelCatalogueLive } from "@sphynx/eval/services/model-catalogue";
import { IdGeneratorLive } from "@sphynx/ids/layer";
import { EmailSenderLive } from "@sphynx/notifications/email/layer";
import { PromptsLayer } from "@sphynx/prompts/layer";
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

const CodebaseLayer = CodebaseConnectionLive.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      EvalCodebaseLive,
      GithubRepositoriesLive.pipe(Layer.provide(FetchHttpClient.layer))
    )
  ),
  Layer.provide(DatabaseLayer)
);

const EvalLayer = Layer.mergeAll(
  evalStackWith(TrialRunnerTrigger),
  BatchSubscriptionsTrigger,
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
  OAuthClientsLive.pipe(Layer.provide(DatabaseLayer)),
  DatabaseLayer,
  PromptsServiceLayer,
  CredentialLayer,
  CodebaseLayer,
  EvalLayer,
  /* Merged so the signup hook and the eval routes read the same meter. */
  BillingLive
);
