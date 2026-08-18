import { AuthLive } from "@anpord/auth";
import { AuthConfigLive } from "@anpord/auth/config";
import { OrganizationStoreLive } from "@anpord/auth/organization";
import { CacheConfigLive } from "@anpord/cache/config";
import { CacheLive } from "@anpord/cache/layer";
import { DatabaseLive } from "@anpord/db/client";
import { DatabaseConfigLive } from "@anpord/db/config";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { EmailSenderLive } from "@anpord/notifications/email/layer";
import { PromptsLayer } from "@anpord/prompts/layer";
import { Layer } from "effect";
import { ServerConfigLive } from "./config";
import { VerifiedKeysLive } from "./http/authentication/verified-keys";
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
  PromptsServiceLayer
);
