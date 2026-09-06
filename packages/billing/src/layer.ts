import { Layer } from "effect";
import { AutumnServiceLive } from "./autumn";
import { BillingConfigLive } from "./config";

export const BillingLive = AutumnServiceLive.pipe(
  Layer.provide(BillingConfigLive)
);
