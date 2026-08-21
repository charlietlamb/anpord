import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { useQuery } from "@tanstack/react-query";
import { ActivityRow } from "@/components/prompts/activity-row";
import { promptActivity } from "@/lib/prompt-activity";
import { deploymentQueries } from "@/lib/query/deployment-queries";
import { promptQueries } from "@/lib/query/prompt-queries";

interface PromptActivityFeedProps {
  readonly promptId: string;
  readonly versions: readonly ResolvedPrompt[];
}

/**
 * What has happened to this prompt, under the prompt itself. It sits below the
 * text rather than beside it because it is read after the thing it describes,
 * and because a record of changes grows without bound while a rail cannot.
 */
export function PromptActivityFeed({
  promptId,
  versions,
}: PromptActivityFeedProps) {
  const deployments = useQuery(deploymentQueries.forPrompt(promptId));
  const events = useQuery(promptQueries.events(promptId));
  const entries = promptActivity(
    versions,
    deployments.data?.items ?? [],
    events.data ?? []
  );

  return (
    <section className="mt-10 border-border-faint border-t pt-6">
      <h2 className="mb-3 font-medium text-muted-foreground text-xs">
        Activity
      </h2>

      {/* One rule behind the markers, so the entries read as a thread rather
          than a stack of rows that happen to be adjacent. */}
      <ul className="relative flex flex-col before:absolute before:top-3 before:bottom-3 before:left-2.5 before:w-px before:bg-border-faint">
        {entries.map((entry) => (
          <ActivityRow entry={entry} key={entry.id} />
        ))}
      </ul>

      {deployments.isError ? (
        <p className="mt-2 text-muted-foreground text-xs">
          Couldn't load the deployment history.
        </p>
      ) : null}
    </section>
  );
}
