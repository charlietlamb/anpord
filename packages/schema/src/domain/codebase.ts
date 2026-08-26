import { Schema } from "effect";

/** One page of the most recently pushed repositories: enough to choose from
 * without being a list to scroll. A full page means "at least this many"
 * rather than a total, and both sides read it from here so the count shown
 * cannot disagree with the number fetched. */
export const REPOSITORY_PAGE_SIZE = 100;

/** How the account behind a repository listing is shown to its owner. */
export const SourceControlAccount = Schema.Struct({
  /** Whether the stored token carries the scope a private clone needs. */
  canReadPrivate: Schema.Boolean,
  login: Schema.String,
}).annotations({
  description: "The GitHub account a member has connected.",
  identifier: "SourceControlAccount",
});
export type SourceControlAccount = typeof SourceControlAccount.Type;

export const Repository = Schema.Struct({
  defaultBranch: Schema.String,
  fullName: Schema.String,
  private: Schema.Boolean,
  /** Clone URL, which is what a case's `source.url` holds. */
  url: Schema.String,
}).annotations({
  description: "One repository the connected account can read.",
  identifier: "Repository",
});
export type Repository = typeof Repository.Type;
