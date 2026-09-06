import type { OrganizationId } from "@anpord/schema/domain/actor";
import type { PromptId, PromptSelector } from "@anpord/schema/domain/prompts";
import { resolutionFor } from "./resolution";

const NAMESPACE = "prompt";

export function organizationPrefix(organizationId: OrganizationId) {
  return `${NAMESPACE}:${organizationId}:`;
}

export function promptPrefix(organizationId: OrganizationId, id: PromptId) {
  return `${organizationPrefix(organizationId)}${encodeURIComponent(id)}:`;
}

export function selectorKey(
  organizationId: OrganizationId,
  id: PromptId,
  selector: PromptSelector
) {
  const prefix = promptPrefix(organizationId, id);
  const resolution = resolutionFor(selector);

  switch (resolution._tag) {
    case "ByVersion":
      return `${prefix}v:${resolution.version}`;
    /* Its own key, not the default channel's: the default may be repointed and
       a key naming the old channel would answer from it. */
    case "Default":
      return `${prefix}default`;
    /* Keyed apart from a stored channel of the same name: it answers from the
       version table, not a placement. */
    case "Latest":
      return `${prefix}latest`;
    default:
      return `${prefix}c:${resolution.channel}`;
  }
}
