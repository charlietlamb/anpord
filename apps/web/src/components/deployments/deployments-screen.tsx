import type { Deployment } from "@anpord/schema/domain/deployments";
import { Button } from "@anpord/ui/components/button";
import { ROW_DIVIDERS } from "@anpord/ui/lib/row-dividers";
import { cn } from "@anpord/ui/lib/utils";
import { DeploymentFilters } from "@/components/deployments/deployment-filters";
import { DeploymentListSkeleton } from "@/components/deployments/deployment-list-skeleton";
import { DeploymentRow } from "@/components/deployments/deployment-row";

interface DeploymentsScreenProps {
  readonly channel: string;
  readonly error: Error | null;
  readonly hasMore: boolean;
  readonly isLoadingMore: boolean;
  readonly isPending: boolean;
  readonly onChannelChange: (channel: string | null) => void;
  readonly onClearPrompt: () => void;
  readonly onLoadMore: () => void;
  readonly prompt: string;
  readonly rows: readonly Deployment[];
}

export function DeploymentsScreen({
  channel,
  error,
  hasMore,
  isLoadingMore,
  isPending,
  onChannelChange,
  onClearPrompt,
  onLoadMore,
  prompt,
  rows,
}: DeploymentsScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col overflow-y-auto px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Deployments</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Every time a channel moved to a different version, newest first.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <DeploymentFilters
          channel={channel}
          onChannelChange={onChannelChange}
          onClearPrompt={onClearPrompt}
          prompt={prompt}
        />
      </div>

      <DeploymentsBody
        error={error}
        filtered={channel !== "" || prompt !== ""}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        isPending={isPending}
        onLoadMore={onLoadMore}
        rows={rows}
      />
    </div>
  );
}

interface DeploymentsBodyProps {
  readonly error: Error | null;
  readonly filtered: boolean;
  readonly hasMore: boolean;
  readonly isLoadingMore: boolean;
  readonly isPending: boolean;
  readonly onLoadMore: () => void;
  readonly rows: readonly Deployment[];
}

function DeploymentsBody({
  error,
  filtered,
  hasMore,
  isLoadingMore,
  isPending,
  onLoadMore,
  rows,
}: DeploymentsBodyProps) {
  if (isPending) {
    return <DeploymentListSkeleton />;
  }

  if (error) {
    return (
      <p className="mt-6 text-muted-foreground text-sm">
        Couldn't load your deployments. {error.message}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-border-surface border-dashed px-6 py-14 text-center">
        <p className="font-heading text-base tracking-tight">
          {filtered ? "Nothing matches these filters" : "No deployments yet"}
        </p>
        <p className="mt-1 text-muted-foreground text-sm">
          {filtered
            ? "Try another channel, or clear the filters to see everything."
            : "Point a channel at a version and it will show up here."}
        </p>
      </div>
    );
  }

  return (
    <>
      <ul
        aria-label="Deployments"
        className={cn(
          "mt-6 flex flex-col overflow-hidden rounded-xl border border-border-surface bg-sidebar-accent",
          ROW_DIVIDERS
        )}
      >
        {rows.map((deployment) => (
          <DeploymentRow deployment={deployment} key={deployment.id} />
        ))}
      </ul>

      {hasMore ? (
        <Button
          className="mt-4 self-center"
          disabled={isLoadingMore}
          onClick={onLoadMore}
          size="sm"
          variant="outline"
        >
          {isLoadingMore ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </>
  );
}
