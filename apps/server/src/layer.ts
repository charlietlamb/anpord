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
      OrganizationLayer,
      EmailSenderLive
    )
  )
);

const PromptsServiceLayer = PromptsLayer.pipe(
  Layer.provide(Layer.mergeAll(DatabaseLayer, CacheLayer))
);

export const AppLayer = Layer.mergeAll(
  ServerConfigLive,
  TelemetryLive,
  AuthLayer,
  OrganizationLayer,
  DatabaseLayer,
  PromptsServiceLayer
);
