import { Effect, Layer } from "effect";
import { EmailConfig, EmailConfigLive } from "./email-config";
import { EmailSender } from "./email-sender";
import { LoggingEmailSenderLive } from "./logging-email-sender";
import { makeResendEmailSender } from "./resend-email-sender";

const selectSender = Layer.unwrapEffect(
  Effect.gen(function* () {
    const config = yield* EmailConfig;

    return config.resend
      ? Layer.succeed(EmailSender, makeResendEmailSender(config.resend))
      : LoggingEmailSenderLive;
  })
);

export const EmailSenderLive = selectSender.pipe(
  Layer.provide(EmailConfigLive)
);
