import { Schema } from "effect";

/** One page of the most recently pushed repositories: enough to choose from
 * without being a list to scroll. A full page means "at least this many"
 * rather than a total, and both sides read it from here so the count shown
 * cannot disagree with the number fetched. */
export const REPOSITORY_PAGE_SIZE = 100;

/**
 * The app's installation on a GitHub account, which is what clones.
 *
 * Belongs to the organisation rather than the member who set it up, so a
 * teammate sees the same thing and the access survives that member leaving.
 */
export const SourceControlAccount = Schema.Struct({
  /** GitHub's own id, which addresses the settings page where repositories
   * are chosen. */
  installationId: Schema.Number,
  login: Schema.String,
  /** Where the reader goes to change which repositories are shared. */
  manageUrl: Schema.String,
  /** "all" or "selected": whether the picker still has anything to offer. */
  repositorySelection: Schema.Literal("all", "selected"),
}).annotations({
  description: "The GitHub installation an organisation clones with.",
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
