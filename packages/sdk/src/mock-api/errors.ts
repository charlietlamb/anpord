import { Data } from "effect";

export class ApiMockError extends Data.TaggedError("ApiMockError")<{
  readonly message: string;
}> {}

export class ApiRequestError extends Data.TaggedError("ApiRequestError")<{
  readonly status: number;
  readonly message: string;
}> {}
