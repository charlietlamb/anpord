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
    /* Its own key rather than the default channel's: the organisation may
       point the default at another channel, and a key naming the old one
       would answer from a channel nobody asked for. */
    case "Default":
      return `${prefix}default`;
    /* Keyed apart from a stored channel of the same name, because it answers
       from the version table rather than from a placement. */
    case "Latest":
      return `${prefix}latest`;
    default:
      return `${prefix}c:${resolution.channel}`;
  }
}
