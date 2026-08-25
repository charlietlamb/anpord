import { Data } from "effect";

/**
 * Billing could not be reached or refused the call.
 *
 * Carries the operation rather than a status code because the callers that
 * log this are debugging which step failed, and a 500 from Autumn and a
 * dropped connection are the same problem to them.
 */
export class BillingUnavailable extends Data.TaggedError("BillingUnavailable")<{
  readonly cause: unknown;
  readonly operation: string;
}> {}
