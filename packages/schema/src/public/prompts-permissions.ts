import type { Permission } from "../domain/permissions";
import { Permissions } from "../domain/permissions";
import type { EndpointName } from "../internal/endpoint-name";
import type { PublicPromptsGroup } from "./prompts-api";

/**
 * The public API is reached with an API key, which carries prompt and channel
 * rights but never administrative ones. Archiving is therefore unreachable from
 * a key by design: a leaked key can publish, which a promotion can undo, but it
 * cannot remove a prompt from the catalogue.
 */
export const PUBLIC_PROMPT_PERMISSIONS: Record<
  EndpointName<typeof PublicPromptsGroup>,
  Permission
> = {
  get: Permissions.Prompts.Read,
  list: Permissions.Prompts.Read,
  create: Permissions.Prompts.Write,
  update: Permissions.Prompts.Write,
  promote: Permissions.Channels.Write,
  archive: Permissions.Organization.Admin,
};
