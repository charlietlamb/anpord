import { Schema } from "effect";

/* Shared with clients so a shown count cannot disagree with the number fetched; a full page means "at least this many", not a total. */
export const REPOSITORY_PAGE_SIZE = 100;

/* Belongs to the organisation, not the member who set it up, so access survives them leaving. */
export const SourceControlAccount = Schema.Struct({
  installationId: Schema.Number,
  login: Schema.String,
  manageUrl: Schema.String,
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
  /* Clone URL, which is what a case's `source.url` holds. */
  url: Schema.String,
}).annotations({
  description: "One repository the connected account can read.",
  identifier: "Repository",
});
export type Repository = typeof Repository.Type;
