import { Context, Data, type Effect } from "effect";
import type { EmailMessage } from "./email-message";

export class EmailDeliveryError extends Data.TaggedError("EmailDeliveryError")<{
  readonly cause: unknown;
  readonly to: string;
}> {}

export interface EmailSenderShape {
  readonly send: (
    message: EmailMessage
  ) => Effect.Effect<void, EmailDeliveryError>;
}

export class EmailSender extends Context.Tag(
  "@anpord/notifications/EmailSender"
)<EmailSender, EmailSenderShape>() {}
