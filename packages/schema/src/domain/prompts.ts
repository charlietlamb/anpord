import { Schema } from "effect";

export const ChannelName = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(36),
  Schema.pattern(/^[a-z0-9][a-z0-9_-]*$/, {
    message: () =>
      "Channel must be lowercase alphanumeric, optionally with - or _",
  }),
  Schema.brand("ChannelName")
).annotations({
  description:
    "Addresses a version. `latest` is derived from the highest version rather " +
    "than stored, so it cannot drift from the version table.",
});
export type ChannelName = typeof ChannelName.Type;

export const PRODUCTION = ChannelName.make("production");
export const LATEST = ChannelName.make("latest");

export const PromptId = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(255),
  Schema.pattern(/^[a-z0-9][a-z0-9/_-]*$/, {
    message: () =>
      "Prompt id must be lowercase alphanumeric, optionally with / _ or -",
  }),
  Schema.brand("PromptId")
);
export type PromptId = typeof PromptId.Type;

export const PromptName = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(255),
  Schema.brand("PromptName")
);
export type PromptName = typeof PromptName.Type;

export const VersionNumber = Schema.Int.pipe(
  Schema.positive(),
  Schema.brand("VersionNumber")
);
export type VersionNumber = typeof VersionNumber.Type;

export const VersionNumberFromString = Schema.NumberFromString.pipe(
  Schema.int(),
  Schema.positive(),
  Schema.brand("VersionNumber")
);

/** Capped so a caller cannot ask for the whole table in one request. */
export const PAGE_LIMIT_MAX = 100;
export const PAGE_LIMIT_DEFAULT = 25;

export const LimitFromString = Schema.NumberFromString.pipe(
  Schema.int(),
  Schema.positive(),
  Schema.lessThanOrEqualTo(PAGE_LIMIT_MAX)
);

export const Timestamp = Schema.Union(Schema.DateFromSelf, Schema.Date);

export const CommitMessage = Schema.String.pipe(Schema.maxLength(500));

export const PromptConfig = Schema.Record({
  key: Schema.String,
  value: Schema.Unknown,
});
export type PromptConfig = typeof PromptConfig.Type;

export const Author = Schema.Struct({
  image: Schema.NullOr(Schema.String),
  name: Schema.String,
});
export type Author = typeof Author.Type;

export const ResolvedPrompt = Schema.Struct({
  author: Schema.NullOr(Author),
  channel: Schema.NullOr(ChannelName),
  commitMessage: Schema.NullOr(CommitMessage),
  config: PromptConfig,
  content: Schema.String,
  createdAt: Timestamp,
  id: PromptId,
  name: PromptName,
  version: VersionNumber,
  versionId: Schema.String,
});
export type ResolvedPrompt = typeof ResolvedPrompt.Type;

export const ChannelPlacement = Schema.Struct({
  channel: ChannelName,
  updatedAt: Timestamp,
  updatedBy: Schema.NullOr(Author),
  version: VersionNumber,
});
export type ChannelPlacement = typeof ChannelPlacement.Type;

export const PromptSummary = Schema.Struct({
  description: Schema.NullOr(Schema.String),
  id: PromptId,
  latestVersion: Schema.NullOr(VersionNumber),
  name: PromptName,
  productionVersion: Schema.NullOr(VersionNumber),
  updatedAt: Timestamp,
});
export type PromptSummary = typeof PromptSummary.Type;

/** Keyset rather than offset: prompts are ordered by when they were last
 * touched, and editing one mid-scroll would shift every offset after it. The
 * id breaks ties, since two prompts can share a timestamp. */
export const PromptCursor = Schema.Struct({
  id: PromptId,
  updatedAt: Timestamp,
});
export type PromptCursor = typeof PromptCursor.Type;

/** "live" is a prompt some channel currently serves; "draft" is one no channel
 * points at yet, which is a different thing from having no versions. */
export const PromptStatusFilter = Schema.Literal("all", "draft", "live");
export type PromptStatusFilter = typeof PromptStatusFilter.Type;

export const PromptSortOrder = Schema.Literal("name", "updated");
export type PromptSortOrder = typeof PromptSortOrder.Type;

export const PromptPage = Schema.Struct({
  items: Schema.Array(PromptSummary),
  /** Opaque to callers, and null once the last page has been read. */
  nextCursor: Schema.NullOr(Schema.String),
});
export type PromptPage = typeof PromptPage.Type;

export const CreatePromptRequest = Schema.Struct({
  commitMessage: Schema.optional(CommitMessage),
  config: Schema.optional(PromptConfig),
  content: Schema.String.pipe(Schema.minLength(1)),
  description: Schema.optional(Schema.String),
  id: PromptId,
  name: PromptName,
  publish: Schema.optional(Schema.Boolean),
});
export type CreatePromptRequest = typeof CreatePromptRequest.Type;

export const AddVersionRequest = Schema.Struct({
  commitMessage: Schema.optional(CommitMessage),
  config: Schema.optional(PromptConfig),
  content: Schema.String.pipe(Schema.minLength(1)),
  publish: Schema.optional(Schema.Boolean),
});
export type AddVersionRequest = typeof AddVersionRequest.Type;

/** Correcting a version rewrites history in place, so it carries only the
 * content: the author, the number, and the time it was first saved all still
 * describe the change that was made. */
export const UpdateVersionRequest = Schema.Struct({
  commitMessage: Schema.optional(CommitMessage),
  config: Schema.optional(PromptConfig),
  content: Schema.String.pipe(Schema.minLength(1)),
});
export type UpdateVersionRequest = typeof UpdateVersionRequest.Type;

export const UpdatePromptRequest = Schema.Struct({
  description: Schema.optional(Schema.String),
  id: Schema.optional(PromptId),
  name: Schema.optional(PromptName),
});
export type UpdatePromptRequest = typeof UpdatePromptRequest.Type;

export const SetChannelRequest = Schema.Struct({
  channel: ChannelName,
  version: VersionNumber,
});
export type SetChannelRequest = typeof SetChannelRequest.Type;

export const PromptSelector = Schema.Struct({
  channel: Schema.optional(ChannelName),
  version: Schema.optional(VersionNumber),
});
export type PromptSelector = typeof PromptSelector.Type;
