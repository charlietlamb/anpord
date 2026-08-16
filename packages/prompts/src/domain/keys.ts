import type { OrganizationId } from "@anpord/schema/actor";
import type { PromptId, PromptSelector } from "@anpord/schema/prompts";
import { resolutionFor } from "./resolution";

const NAMESPACE = "prompt";

export function promptPrefix(organizationId: OrganizationId, id: PromptId) {
  return `${NAMESPACE}:${organizationId}:${encodeURIComponent(id)}:`;
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
    case "Latest":
      return `${prefix}latest`;
    default:
      return `${prefix}c:${resolution.channel}`;
  }
}
