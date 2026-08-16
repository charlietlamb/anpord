export interface EmailMessage {
  readonly subject: string;
  readonly text: string;
  readonly to: string;
}
