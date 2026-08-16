import { Effect, Redacted } from "effect";
import { Resend } from "resend";
import type { EmailMessage } from "./email-message";
import { EmailDeliveryError, EmailSender } from "./email-sender";

export interface ResendCredentials {
  readonly apiKey: Redacted.Redacted<string>;
  readonly from: string;
}

export const makeResendEmailSender = (credentials: ResendCredentials) => {
  const client = new Resend(Redacted.value(credentials.apiKey));

  const send = (message: EmailMessage) =>
    Effect.tryPromise({
      catch: (cause) => new EmailDeliveryError({ cause, to: message.to }),
      try: () =>
        client.emails.send({
          from: credentials.from,
          subject: message.subject,
          text: message.text,
          to: message.to,
        }),
    }).pipe(
      Effect.flatMap((result) =>
        result.error
          ? Effect.fail(
              new EmailDeliveryError({ cause: result.error, to: message.to })
            )
          : Effect.logInfo("email sent")
      ),
      Effect.withSpan("EmailSender.send"),
      Effect.annotateLogs({ subject: message.subject, to: message.to })
    );

  return EmailSender.of({ send });
};
