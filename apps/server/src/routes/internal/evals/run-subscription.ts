import { auth, configure } from "@trigger.dev/sdk";
import { Config, Effect, Redacted } from "effect";

const TTL = "1h";
const TTL_MILLIS = 60 * 60 * 1000;

const tagOf = (runId: string) => `run_${runId}`;

const secretKey = Config.redacted("TRIGGER_SECRET_KEY").pipe(
  Config.orElse(() => Config.redacted("TRIGGER_API_KEY"))
);

export const mintRunSubscription = (runId: string) =>
  Effect.gen(function* () {
    const key = yield* secretKey.pipe(Effect.orDie);
    const tag = tagOf(runId);

    configure({ secretKey: Redacted.value(key) });

    const token = yield* Effect.tryPromise(() =>
      auth.createPublicToken({
        expirationTime: TTL,
        scopes: { read: { tags: [tag] } },
      })
    ).pipe(
      Effect.tapErrorCause((cause) =>
        Effect.logError("could not mint a run subscription", cause)
      ),
      Effect.orDie
    );

    return { expiresAtMillis: Date.now() + TTL_MILLIS, tag, token };
  });
