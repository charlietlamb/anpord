import { Data } from "effect";

export class EvalDefinitionInvalid extends Data.TaggedError(
  "EvalDefinitionInvalid"
)<{ readonly cause?: unknown; readonly reason: string }> {
  override get message() {
    return this.reason;
  }
}
