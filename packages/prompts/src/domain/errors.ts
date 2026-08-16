import type { ChannelName, PromptId } from "@anpord/schema/domain/prompts";
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

export class PromptHasNoVersions extends Data.TaggedError(
  "PromptHasNoVersions"
)<{
  readonly promptId: PromptId;
}> {}

export class VersionNotFound extends Data.TaggedError("VersionNotFound")<{
  readonly promptId: PromptId;
  readonly version: number;
}> {}

export class VersionConflict extends Data.TaggedError("VersionConflict")<{
  readonly promptId: PromptId;
}> {}

export class ChannelNameTaken extends Data.TaggedError("ChannelNameTaken")<{
  readonly channel: ChannelName;
}> {}

export class ChannelMissing extends Data.TaggedError("ChannelMissing")<{
  readonly channel: ChannelName;
}> {}

export class ChannelInUse extends Data.TaggedError("ChannelInUse")<{
  readonly channel: ChannelName;
  readonly promptCount: number;
}> {}

/** `production` is named by the schema, the MCP tools and the SDK, so renaming
 * or removing it would break callers that never asked for the change. */
export class ChannelReserved extends Data.TaggedError("ChannelReserved")<{
  readonly channel: ChannelName;
}> {}

export class PromptStoreError extends Data.TaggedError("PromptStoreError")<{
  readonly cause: unknown;
  readonly operation: string;
}> {}

export class InvalidCursor extends Data.TaggedError("InvalidCursor")<{
  readonly cursor: string;
}> {}

export type PromptError =
  | ChannelInUse
  | ChannelMissing
  | ChannelNameTaken
  | ChannelNotFound
  | ChannelReserved
  | InvalidCursor
  | PromptIdTaken
  | PromptHasNoVersions
  | PromptNotFound
  | PromptStoreError
  | VersionConflict
  | VersionNotFound;
