import { SectionLabel } from "@anpord/ui/components/ui/section-label";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ShowMore } from "@/components/layout/show-more";
import { ActivityRow } from "@/components/prompts/activity-row";
import { activityQueries } from "@/lib/query/activity-queries";

interface PromptActivityFeedProps {
  readonly promptId: string;
}

export function PromptActivityFeed({ promptId }: PromptActivityFeedProps) {
  const activity = useInfiniteQuery(activityQueries.forPrompt(promptId));
  const entries = activity.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section className="mt-10 border-border-faint border-t pt-6">
      <SectionLabel className="mb-3">Activity</SectionLabel>

      <ul className="relative flex flex-col before:absolute before:top-3 before:bottom-3 before:left-2.5 before:w-px before:bg-border-faint">
        {entries.map((entry) => (
          <ActivityRow entry={entry} key={entry.id} />
        ))}
      </ul>

      {activity.isError ? (
        <p className="mt-2 text-muted-foreground text-xs">
          Couldn't load the history.
        </p>
      ) : null}

      <ShowMore
        className="mt-3"
        hasMore={activity.hasNextPage}
        label="Show earlier"
        loading={activity.isFetchingNextPage}
        onMore={() => activity.fetchNextPage()}
      />
    </section>
  );
}
