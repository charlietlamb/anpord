import { Data } from "effect";

export class CredentialError extends Data.TaggedError("CredentialError")<{
  readonly code?: "internal" | "not-found";
  readonly message: string;
}> {}
