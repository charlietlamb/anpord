import { Autumn } from "autumn-js";
import { Context, Effect, Layer, Redacted } from "effect";
import { BillingConfig } from "./config";
import { BillingUnavailable } from "./domain/errors";

export interface AutumnShape {
  /**
   * Runs an SDK call, or nothing where no key is configured.
   *
   * Everything Autumn offers is reached through the client itself rather than
   * wrapped method by method, so adding a call is a call site rather than a
   * change here.
   */
  readonly call: (
    operation: string,
    run: (client: Autumn) => Promise<unknown>
  ) => Effect.Effect<void, BillingUnavailable>;
}

export class AutumnService extends Context.Tag("@anpord/billing/Autumn")<
  AutumnService,
  AutumnShape
>() {}

export const AutumnServiceLive = Layer.effect(
  AutumnService,
  Effect.gen(function* () {
    const { autumn } = yield* BillingConfig;

    /* Without a key the product still runs evals and accepts signups; it
       simply counts nothing. */
    if (autumn === undefined) {
      return AutumnService.of({ call: () => Effect.void });
    }

    /* failOpen off: it drops a call and reports success, which loses usage
       silently. Callers already log and carry on. */
    const client = new Autumn({
      failOpen: false,
      secretKey: Redacted.value(autumn.apiKey),
      ...(autumn.baseUrl === undefined ? {} : { serverURL: autumn.baseUrl }),
    });

    return AutumnService.of({
      call: (operation, run) =>
        Effect.tryPromise({
          catch: (cause) => new BillingUnavailable({ cause, operation }),
          try: () => run(client),
        }).pipe(Effect.asVoid, Effect.withSpan(operation)),
    });
  })
);
