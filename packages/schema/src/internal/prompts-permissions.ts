import type { Permission } from "../domain/permissions";
import { Permissions } from "../domain/permissions";
import type { EndpointName } from "./endpoint-name";
import type { PromptsGroup } from "./prompts-api";

/**
 * Every endpoint in the group names the permission it needs, in one place, so
 * the rule is reviewable as a table rather than scattered across handlers.
 *
 * The record is exhaustive over the group's endpoint names: adding an endpoint
 * without adding it here does not compile, which is what stops a new route from
 * silently shipping unguarded.
 */
export const PROMPT_PERMISSIONS: Record<
  EndpointName<typeof PromptsGroup>,
  Permission
> = {
  list: Permissions.Prompts.Read,
  get: Permissions.Prompts.Read,
  listVersions: Permissions.Prompts.Read,
  listChannels: Permissions.Channels.Read,

  create: Permissions.Prompts.Write,
  update: Permissions.Prompts.Write,
  addVersion: Permissions.Prompts.Write,
  /** Rewrites a version in place, which can change what callers already
   * receive, so it asks for publishing rights rather than authoring ones. */
  updateVersion: Permissions.Channels.Write,
  setChannel: Permissions.Channels.Write,

  /** Removes the prompt from every listing the organisation works from. */
  archive: Permissions.Organization.Admin,
};
