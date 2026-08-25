import { Layer } from "effect";
import { AutumnServiceLive } from "./autumn";
import { BillingConfigLive } from "./config";

/** Billing, ready to provide. The SDK carries its own transport. */
export const BillingLive = AutumnServiceLive.pipe(
  Layer.provide(BillingConfigLive)
);
