import type { Deployment } from "@anpord/schema/domain/deployments";
import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";

/** An author is only known for a version; a deployment records the move. */
interface Actor {
  readonly image?: string | null;
  readonly name: string;
}

export type ActivityEntry =
  | {
      readonly at: Date;
      readonly author: Actor | null;
      readonly id: string;
      readonly kind: "saved";
      readonly message: string | null;
      readonly version: number;
    }
  | {
      readonly at: Date;
      readonly channel: string;
      readonly from: number | null;
      readonly id: string;
      readonly kind: "deployed";
      readonly to: number;
    };

/**
 * Everything that has happened to a prompt, newest first. Saving a version and
 * pointing a channel at one are the same kind of fact to a reader catching up,
 * so they are read as one sequence rather than two lists to reconcile.
 */
export const promptActivity = (
  versions: readonly ResolvedPrompt[],
  deployments: readonly Deployment[]
): readonly ActivityEntry[] => {
  const saves = versions.map(
    (version): ActivityEntry => ({
      at: new Date(version.createdAt),
      author: version.author ?? null,
      id: `saved-${version.versionId}`,
      kind: "saved",
      message: version.commitMessage ?? null,
      version: version.version,
    })
  );

  const moves = deployments.map(
    (deployment): ActivityEntry => ({
      at: new Date(deployment.deployedAt),
      channel: deployment.channel,
      from: deployment.fromVersion,
      id: `deployed-${deployment.id}`,
      kind: "deployed",
      to: deployment.toVersion,
    })
  );

  return [...saves, ...moves].sort(
    (left, right) => right.at.getTime() - left.at.getTime()
  );
};
