import { Data } from "effect";

export class BillingUnavailable extends Data.TaggedError("BillingUnavailable")<{
  readonly cause: unknown;
  readonly operation: string;
}> {}
