import type { Deployment } from "@anpord/schema/domain/deployments";
import { Button } from "@anpord/ui/components/button";
import { ROW_DIVIDERS } from "@anpord/ui/lib/row-dividers";
import { cn } from "@anpord/ui/lib/utils";
import { DeploymentRow } from "@/components/deployments/deployment-row";

interface DeploymentsScreenProps {
  readonly error: Error | null;
  readonly hasMore: boolean;
  readonly isLoadingMore: boolean;
  readonly isPending: boolean;
  readonly onLoadMore: () => void;
  readonly rows: readonly Deployment[];
}

/** Presentation only, so the dev harness renders the same screen the route
 * does rather than a copy that can drift from it. */
export function DeploymentsScreen({
  error,
  hasMore,
  isLoadingMore,
  isPending,
  onLoadMore,
  rows,
}: DeploymentsScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col overflow-y-auto px-6 py-10">
      <div>
        <h1 className="font-heading text-2xl tracking-tight">Deployments</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Every time a channel moved to a different version, newest first.
        </p>
      </div>

      <DeploymentsBody
        error={error}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        isPending={isPending}
        onLoadMore={onLoadMore}
        rows={rows}
      />
    </div>
  );
}

function DeploymentsBody({
  error,
  hasMore,
  isLoadingMore,
  isPending,
  onLoadMore,
  rows,
}: DeploymentsScreenProps) {
  if (isPending) {
    return <p className="mt-6 text-muted-foreground text-sm">Loading…</p>;
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
          No deployments yet
        </p>
        <p className="mt-1 text-muted-foreground text-sm">
          Point a channel at a version and it will show up here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "mt-6 flex flex-col overflow-hidden rounded-xl border border-border-surface bg-sidebar-accent",
          ROW_DIVIDERS
        )}
      >
        {rows.map((deployment) => (
          <DeploymentRow deployment={deployment} key={deployment.id} />
        ))}
      </div>

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
