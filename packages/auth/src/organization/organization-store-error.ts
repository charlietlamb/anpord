import { Data } from "effect";

export class OrganizationStoreError extends Data.TaggedError(
  "OrganizationStoreError"
)<{
  readonly cause: unknown;
  readonly operation: string;
}> {}

export class OrganizationMissing extends Data.TaggedError(
  "OrganizationMissing"
)<{
  readonly organizationId: string;
}> {}
