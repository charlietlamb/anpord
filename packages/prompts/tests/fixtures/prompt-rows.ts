import { OrganizationId, UserId } from "@anpord/schema/domain/actor";
import { PromptId } from "@anpord/schema/domain/prompts";
import { Effect } from "effect";
import type { VersionRow } from "../../src/repositories/prompt-version-repository";
import type { PromptCacheShape } from "../../src/services/prompt-cache";

export const noopCache: PromptCacheShape = {
  invalidate: () => Effect.void,
  invalidateOrganization: () => Effect.void,
};

export const actor = {
  id: UserId.make("user_1"),
  organizationId: OrganizationId.make("org_1"),
};

export const promptId = PromptId.make("greeting");

const at = new Date("2026-01-01T00:00:00.000Z");

export const promptRow = {
  archivedAt: null,
  createdAt: at,
  createdBy: actor.id,
  description: null,
  id: promptId,
  internalId: "pr_1",
  name: "Greeting",
  organizationId: actor.organizationId,
  updatedAt: at,
};

export const versionRow = (
  version: number,
  internalId: string
): VersionRow => ({
  author: { image: null, name: "Ada" },
  commitMessage: null,
  config: {},
  content: `content ${version}`,
  createdAt: at,
  createdBy: actor.id,
  internalId,
  promptInternalId: promptRow.internalId,
  version,
});
