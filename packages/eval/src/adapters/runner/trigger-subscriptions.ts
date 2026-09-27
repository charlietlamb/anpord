import { batchTagOf } from "@anpord/schema/domain/evals";
import { auth, configure } from "@trigger.dev/sdk";
import { Clock, Effect, Layer, Redacted } from "effect";
import { BatchSubscriptions } from "../../ports/batch-subscriptions";
import { triggerSecretKey } from "./trigger";

const TTL = "1h";
const TTL_MILLIS = 60 * 60 * 1000;

const mint = (batchId: string) =>
  Effect.gen(function* () {
    const key = yield* triggerSecretKey.pipe(Effect.orDie);
    const tag = batchTagOf(batchId);

    configure({ secretKey: Redacted.value(key) });

    const token = yield* Effect.tryPromise(() =>
      auth.createPublicToken({
        expirationTime: TTL,
        scopes: { read: { tags: [tag] } },
      })
    ).pipe(Effect.orDie);

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
