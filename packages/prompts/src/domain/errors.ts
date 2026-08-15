import type { ChannelName, PromptId } from "@anpord/schema/prompts";
import { Data } from "effect";

export class PromptNotFound extends Data.TaggedError("PromptNotFound")<{
  readonly id: PromptId;
}> {}

export class PromptIdTaken extends Data.TaggedError("PromptIdTaken")<{
  readonly id: PromptId;
}> {}

export class ChannelNotFound extends Data.TaggedError("ChannelNotFound")<{
  readonly channel: ChannelName;
  readonly promptId: PromptId;
}> {}

export class VersionNotFound extends Data.TaggedError("VersionNotFound")<{
  readonly promptId: PromptId;
  readonly version: number;
}> {}

/**
 * Two writers computed the same next version and one lost the unique index
 * race. Callers should re-read and retry rather than surface this.
 */
export class VersionConflict extends Data.TaggedError("VersionConflict")<{
  readonly promptId: PromptId;
}> {}

export class PromptStoreError extends Data.TaggedError("PromptStoreError")<{
  readonly cause: unknown;
  readonly operation: string;
}> {}

export type PromptError =
  | ChannelNotFound
  | PromptIdTaken
  | PromptNotFound
  | PromptStoreError
  | VersionConflict
  | VersionNotFound;
