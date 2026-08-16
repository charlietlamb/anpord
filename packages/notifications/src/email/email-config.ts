import { Config, Context, Layer, Option, Redacted } from "effect";
import type { Redacted as RedactedValue } from "effect/Redacted";

export interface EmailConfigShape {
  readonly resend:
    | { readonly apiKey: RedactedValue<string>; readonly from: string }
    | undefined;
}

export class EmailConfig extends Context.Tag(
  "@anpord/notifications/EmailConfig"
)<EmailConfig, EmailConfigShape>() {}

const resendCredentials = Config.all({
  apiKey: Config.redacted("RESEND_API_KEY"),
  from: Config.string("EMAIL_FROM"),
}).pipe(
  Config.option,
  Config.map(
    Option.filter(
      ({ apiKey, from }) =>
        Redacted.value(apiKey).trim().length > 0 && from.trim().length > 0
    )
  ),
  Config.map(Option.getOrUndefined)
);

export const EmailConfigLive = Layer.effect(
  EmailConfig,
  Config.all({ resend: resendCredentials })
);
