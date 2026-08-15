import type { OrganizationId } from "@anpord/schema/actor";
import {
  LATEST,
  PRODUCTION,
  type PromptId,
  type PromptSelector,
} from "@anpord/schema/prompts";

const NAMESPACE = "prompt";

/**
 * Keyed on what callers pass, so a resolve is a single cache read with no
 * lookup first. A rename invalidates both handles, so no entry is orphaned.
 */
export function promptPrefix(organizationId: OrganizationId, id: PromptId) {
  return `${NAMESPACE}:${organizationId}:${encodeURIComponent(id)}:`;
}

export function selectorKey(
  organizationId: OrganizationId,
  id: PromptId,
  selector: PromptSelector
) {
  const prefix = promptPrefix(organizationId, id);

  if (selector.version !== undefined) {
    return `${prefix}v:${selector.version}`;
  }

  const channel = selector.channel ?? PRODUCTION;
  return channel === LATEST ? `${prefix}latest` : `${prefix}c:${channel}`;
}
