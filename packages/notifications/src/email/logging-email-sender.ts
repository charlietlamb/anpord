import { Effect, Layer } from "effect";
import type { EmailMessage } from "./email-message";
import { EmailSender } from "./email-sender";

const send = (message: EmailMessage) =>
  Effect.logWarning("email not delivered — no email provider configured").pipe(
    Effect.zipRight(Effect.logInfo(message.text)),
    Effect.withSpan("EmailSender.send"),
    Effect.annotateLogs({ subject: message.subject, to: message.to })
  );

export const LoggingEmailSenderLive = Layer.succeed(
  EmailSender,
  EmailSender.of({ send })
);
