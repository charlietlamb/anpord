import { AuthLive } from "@anpord/auth";
import { AuthConfigLive } from "@anpord/auth/config";
import { OrganizationStoreLive } from "@anpord/auth/organization";
import { CacheConfigLive } from "@anpord/cache/config";
import { CacheLive } from "@anpord/cache/layer";
import { DatabaseLive } from "@anpord/db/client";
import { DatabaseConfigLive } from "@anpord/db/config";
import {
  EvalGridLive,
  EvalSandboxLive,
  ReconcilerSweepLive,
} from "@anpord/eval/layer";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { EmailSenderLive } from "@anpord/notifications/email/layer";
import { PromptsLayer } from "@anpord/prompts/layer";
import { BunContext } from "@effect/platform-bun";
import { Layer } from "effect";
import { ServerConfigLive } from "./config";
import { VerifiedKeysLive } from "./http/authentication/verified-keys";
import { EvalCredentialsLive } from "./routes/internal/evals/credentials";
import { TelemetryLive } from "./telemetry";

const DatabaseLayer = DatabaseLive.pipe(Layer.provide(DatabaseConfigLive));
const CacheLayer = CacheLive.pipe(Layer.provide(CacheConfigLive));

const OrganizationLayer = OrganizationStoreLive.pipe(
  Layer.provide(Layer.mergeAll(DatabaseLayer, IdGeneratorLive))
);

const AuthLayer = AuthLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      AuthConfigLive,
      DatabaseLayer,
      IdGeneratorLive,
      OrganizationLayer,
      EmailSenderLive
    )
  )
);

const PromptsServiceLayer = PromptsLayer.pipe(
  Layer.provide(Layer.mergeAll(DatabaseLayer, CacheLayer))
);

const VerifiedKeysLayer = VerifiedKeysLive.pipe(Layer.provide(AuthLayer));

/** Runs execute in this process rather than through a worker: a trial is
 * already scoped, so it cleans up after itself, and one fewer moving part is
 * worth more right now. A run in flight when the process dies is lost, but
 * every cell it had already finished is on disk and still comparable. */
const EvalLayer = Layer.mergeAll(
  EvalGridLive.pipe(
    Layer.provide(EvalSandboxLive),
    Layer.provide(Layer.mergeAll(DatabaseLayer, IdGeneratorLive))
  ),
  /* Opted into here, because sweeping abandoned work is a decision about
     this process's lifetime rather than a property of the domain. */
  ReconcilerSweepLive.pipe(Layer.provide(DatabaseLayer)),
  EvalCredentialsLive.pipe(Layer.provide(BunContext.layer))
);

export const AppLayer = Layer.mergeAll(
  /** The router reads the trusted origins to tell our own dashboard from
   * another site driving a signed-in session. */
  AuthConfigLive,
  ServerConfigLive,
  TelemetryLive,
  AuthLayer,
  VerifiedKeysLayer,
  OrganizationLayer,
  DatabaseLayer,
  PromptsServiceLayer,
  EvalLayer
);
