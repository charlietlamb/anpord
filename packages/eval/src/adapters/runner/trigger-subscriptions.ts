import { batchTagOf } from "@sphynx/schema/domain/eval-batch-subscription";
import { Clock, Effect, Layer } from "effect";
import { BatchSubscriptions } from "../../ports/batch-subscriptions";
import { triggerSdk, triggerSecretKey } from "./trigger";

const TTL = "1h";
const TTL_MILLIS = 60 * 60 * 1000;

const mint = (batchId: string) =>
  Effect.gen(function* () {
    const key = yield* triggerSecretKey.pipe(Effect.orDie);
    const tag = batchTagOf(batchId);

    const token = yield* Effect.tryPromise(async () => {
      const { auth } = await triggerSdk(key);
      return auth.createPublicToken({
        expirationTime: TTL,
        scopes: { read: { tags: [tag] } },
      });
    }).pipe(Effect.orDie);

    return {
      expiresAtMillis: (yield* Clock.currentTimeMillis) + TTL_MILLIS,
      tag,
      token,
    };
  }).pipe(Effect.withSpan("Evals.subscription", { attributes: { batchId } }));

export const BatchSubscriptionsTrigger = Layer.succeed(
  BatchSubscriptions,
  BatchSubscriptions.of({ mint })
);
