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

const nonEmpty = (value: RedactedValue<string>) =>
  Redacted.value(value).trim().length > 0;

/* Sandbox wins where both are set, so a laptop cannot post live usage. */
const selectedKey = Config.all({
  live: Config.redacted("AUTUMN_API_KEY").pipe(Config.option),
  sandbox: Config.redacted("AUTUMN_SANDBOX_API_KEY").pipe(Config.option),
}).pipe(
  Config.map(({ live, sandbox }) =>
    Option.filter(sandbox, nonEmpty).pipe(
      Option.orElse(() => Option.filter(live, nonEmpty))
    )
  )
);

const optional = (name: string) =>
  Config.string(name).pipe(Config.option, Config.map(Option.getOrUndefined));

const autumn = Config.all({
  apiKey: selectedKey,
  baseUrl: optional("AUTUMN_BASE_URL"),
}).pipe(
  Config.map(({ apiKey, baseUrl }) =>
    Option.match(apiKey, {
      onNone: () => undefined,
      onSome: (key) => ({ apiKey: key, baseUrl }),
    })
  )
);

export const BillingConfigLive = Layer.effect(
  BillingConfig,
  Config.all({ autumn })
);
