import { Data } from "effect";

export class CodebaseError extends Data.TaggedError("CodebaseError")<{
  readonly cause?: unknown;
  readonly message: string;
}> {}
