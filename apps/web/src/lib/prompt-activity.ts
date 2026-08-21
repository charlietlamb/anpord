import type { Deployment } from "@anpord/schema/domain/deployments";
import type { PromptEvent } from "@anpord/schema/domain/prompt-events";
import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";

interface Actor {
  readonly image?: string | null;
  readonly name: string;
}

/** Both kinds of entry are something a person did, so both name one. Sharing
 * the field is what lets the feed read as one sequence rather than two lists
 * with different subjects. */
interface Acted {
  readonly actor: Actor | null;
  readonly at: Date;
  readonly id: string;
}

export type ActivityEntry =
  | (Acted & {
      readonly kind: "saved";
      readonly message: string | null;
      readonly version: number;
    })
  | (Acted & {
      readonly channel: string;
      readonly from: number | null;
      readonly kind: "deployed";
      readonly to: number;
    })
  | (Acted & {
      readonly kind: "overwrote";
      readonly version: number | null;
    });

/**
 * Everything that has happened to a prompt, newest first. Saving a version and
 * pointing a channel at one are the same kind of fact to a reader catching up,
 * so they are read as one sequence rather than two lists to reconcile.
 */
export const promptActivity = (
  versions: readonly ResolvedPrompt[],
  deployments: readonly Deployment[],
  events: readonly PromptEvent[]
): readonly ActivityEntry[] => {
  const saves = versions.map(
    (version): ActivityEntry => ({
      actor: version.author ?? null,
      at: new Date(version.createdAt),
      id: `saved-${version.versionId}`,
      kind: "saved",
      message: version.commitMessage ?? null,
      version: version.version,
    })
  );

  const moves = deployments.map(
    (deployment): ActivityEntry => ({
      actor: deployment.deployedBy ?? null,
      at: new Date(deployment.deployedAt),
      channel: deployment.channel,
      from: deployment.fromVersion,
      id: `deployed-${deployment.id}`,
      kind: "deployed",
      to: deployment.toVersion,
    })
  );

  const recorded = events.map(
    (event): ActivityEntry => ({
      actor: event.actor,
      at: new Date(event.createdAt),
      id: event.id,
      kind: event.kind,
      version: event.version,
    })
  );

  return [...saves, ...moves, ...recorded].sort(
    (left, right) => right.at.getTime() - left.at.getTime()
  );
};
