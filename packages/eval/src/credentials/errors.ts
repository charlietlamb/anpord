import { Data } from "effect";

export class CredentialError extends Data.TaggedError("CredentialError")<{
  readonly code?: "internal" | "not-found";
  readonly message: string;
}> {}

export const connectionNotFound = () =>
  new CredentialError({
    code: "not-found",
    message: "Credential connection not found",
  });

export const storeUnavailable = () =>
  new CredentialError({
    code: "internal",
    message: "Credential store is unavailable",
  });
