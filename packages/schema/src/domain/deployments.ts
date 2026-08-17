import { Schema } from "effect";
import {
  Author,
  ChannelName,
  PromptId,
  PromptName,
  Timestamp,
  VersionNumber,
} from "./prompts";

/**
 * What kind of move this was. Derived from the versions rather than stored, so
 * it cannot disagree with them, and named here rather than left to the reader
 * to work out by comparing two numbers.
 */
export const DeploymentKind = Schema.Literal("first", "promotion", "rollback");
export type DeploymentKind = typeof DeploymentKind.Type;

export const Deployment = Schema.Struct({
  channel: ChannelName,
  deployedAt: Timestamp,
  deployedBy: Schema.NullOr(Author),
  /** Absent on the first deployment to a channel. */
  fromVersion: Schema.NullOr(VersionNumber),
  id: Schema.String,
  kind: DeploymentKind,
  promptId: PromptId,
  promptName: PromptName,
  toVersion: VersionNumber,
}).annotations({
  description: "One channel moving to a version, and who moved it.",
  identifier: "Deployment",
});
export type Deployment = typeof Deployment.Type;
