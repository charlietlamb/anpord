import { AuthLive } from "@anpord/auth";
import { AuthConfigLive } from "@anpord/auth/config";
import { OrganizationStoreLive } from "@anpord/auth/organization";
import { BillingLive } from "@anpord/billing/layer";
import { CacheConfigLive } from "@anpord/cache/config";
import { CacheLive } from "@anpord/cache/layer";
import { DatabaseLive } from "@anpord/db/client";
import { DatabaseConfigLive } from "@anpord/db/config";
import {
  GithubAppConfigLive,
  GithubAppLive,
} from "@anpord/eval/codebase/github-app";
import { GithubRepositoriesLive } from "@anpord/eval/codebase/github-repositories";
import { InstallationsLive } from "@anpord/eval/codebase/installations";
import { CredentialCipherLive } from "@anpord/eval/credentials/cipher";
import {
  CredentialConnectionsLive,
  CredentialResolverLive,
} from "@anpord/eval/credentials/connections";
import { DeviceAuthLive } from "@anpord/eval/credentials/device-auth";
import {
  EvalGridLive,
  EvalHarnessVersionsLive,
  EvalModelCatalogueLive,
  EvalSandboxLive,
  ReconcilerSweepLive,
} from "@anpord/eval/layer";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { EmailSenderLive } from "@anpord/notifications/email/layer";
import { PromptsLayer } from "@anpord/prompts/layer";
import { FetchHttpClient } from "@effect/platform";
import { BunContext } from "@effect/platform-bun";
import { Layer } from "effect";
import { ServerConfigLive } from "./config";
import { VerifiedKeysLive } from "./http/authentication/verified-keys";
import { EvalCredentialsLive } from "./routes/internal/evals/credentials";
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
  CredentialResolverLive.pipe(Layer.provide(CredentialDependencies)),
  DeviceAuthLive.pipe(
    Layer.provide(CredentialConnectionsLayer),
    Layer.provide(CredentialDependencies)
  )
);

/* The token comes from the database and the listing from GitHub, so neither
   depends on the other and both are provided beside the credential layer. */
const CodebaseLayer = Layer.mergeAll(
  InstallationsLive.pipe(Layer.provide(DatabaseLayer)),
  GithubAppLive.pipe(Layer.provide(GithubAppConfigLive)),
  GithubRepositoriesLive.pipe(Layer.provide(FetchHttpClient.layer))
);

const EvalLayer = Layer.mergeAll(
  EvalGridLive.pipe(
    Layer.provide(EvalSandboxLive),
    Layer.provide(CredentialLayer),
    Layer.provide(EvalHarnessVersionsLive),
    Layer.provide(Layer.mergeAll(DatabaseLayer, IdGeneratorLive))
  ),

  ReconcilerSweepLive.pipe(Layer.provide(DatabaseLayer)),
  EvalCredentialsLive.pipe(Layer.provide(BunContext.layer)),
  EvalHarnessVersionsLive,

  EvalModelCatalogueLive.pipe(
    Layer.provide(Layer.merge(BunContext.layer, FetchHttpClient.layer))
  )
);

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
  /* Merged rather than provided to one branch: the auth hook registers a
     customer at signup and the eval routes count against it, so both sides
     read the same meter. */
  BillingLive
);
