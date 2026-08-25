import { Config, Context, Layer, Option, Redacted } from "effect";
import type { Redacted as RedactedValue } from "effect/Redacted";

export interface BillingConfigShape {
  /** Undefined without a key, so billing stays off the critical path. */
  readonly autumn:
    | {
        readonly apiKey: RedactedValue<string>;
        readonly baseUrl: string | undefined;
      }
    | undefined;
}

export class BillingConfig extends Context.Tag("@anpord/billing/BillingConfig")<
  BillingConfig,
  BillingConfigShape
>() {}

const optional = (name: string) =>
  Config.string(name).pipe(Config.option, Config.map(Option.getOrUndefined));

/* One key, whichever account it belongs to. Choosing between a live and a
   sandbox key here would put the decision in the wrong place: which Autumn
   account an environment bills against is a property of that environment, and
   it says so by which key it sets. */
const autumn = Config.all({
  apiKey: Config.redacted("AUTUMN_API_KEY").pipe(Config.option),
  baseUrl: optional("AUTUMN_BASE_URL"),
}).pipe(
  Config.map(({ apiKey, baseUrl }) =>
    Option.match(
      /* An empty key is not a key: a half-filled environment should behave
         like an unconfigured one rather than fail every call with a 401. */
      Option.filter(apiKey, (key) => Redacted.value(key).trim().length > 0),
      {
        onNone: () => undefined,
        onSome: (key) => ({ apiKey: key, baseUrl }),
      }
    )
  )
);

export const BillingConfigLive = Layer.effect(
  BillingConfig,
  Config.all({ autumn })
);
