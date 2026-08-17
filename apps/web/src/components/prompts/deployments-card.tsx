import type { Deployment } from "@anpord/schema/domain/deployments";
import { ChannelBadge } from "@anpord/ui/components/ui/channel-badge";
import { ROW_DIVIDERS } from "@anpord/ui/lib/row-dividers";
import { cn } from "@anpord/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { VersionMove } from "@/components/deployments/version-move";
import { RailCard } from "@/components/rail/rail-card";
import { deploymentQueries } from "@/lib/query/deployment-queries";
import { useChannelColor } from "@/lib/query/use-channel-colors";
import { useRelativeTime } from "@/lib/use-relative-time";

interface DeploymentsCardProps {
  readonly promptId: string;
}

export function DeploymentsCard({ promptId }: DeploymentsCardProps) {
  const deployments = useQuery(deploymentQueries.forPrompt(promptId));
  const rows = deployments.data?.items ?? [];

  return (
    <RailCard className="px-0 py-0" title="History">
      <DeploymentsCardBody
        failed={deployments.isError}
        isPending={deployments.isPending}
        rows={rows}
      />
    </RailCard>
  );
}

interface DeploymentsCardBodyProps {
  readonly failed: boolean;
  readonly isPending: boolean;
  readonly rows: readonly Deployment[];
}

function DeploymentsCardBody({
  failed,
  isPending,
  rows,
}: DeploymentsCardBodyProps) {
  if (isPending) {
    return (
      <p className="px-3.5 py-3 text-muted-foreground text-xs">Loading…</p>
    );
  }

  /** Distinct from the empty state below, which would otherwise claim the
   * prompt has never been deployed when the request simply failed. */
  if (failed) {
    return (
      <p className="px-3.5 py-3 text-muted-foreground text-xs">
        Couldn't load deployments.
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="px-3.5 py-3 text-muted-foreground text-xs">
        Not deployed yet.
      </p>
    );
  }

  return (
    <ul
      aria-label="Recent deployments"
      className={cn("flex flex-col", ROW_DIVIDERS)}
    >
      {rows.map((deployment) => (
        <CardRow deployment={deployment} key={deployment.id} />
      ))}
    </ul>
  );
}

function CardRow({ deployment }: { readonly deployment: Deployment }) {
  const when = useRelativeTime(deployment.deployedAt);
  const channelColor = useChannelColor();

  return (
    <li className="flex items-center gap-2 px-3.5 py-2.5">
      <ChannelBadge
        color={channelColor(deployment.channel)}
        name={deployment.channel}
        size="xs"
      />

      <VersionMove
        className="gap-1"
        from={deployment.fromVersion}
        to={deployment.toVersion}
      />

      <time
        className="ml-auto shrink-0 truncate whitespace-nowrap text-right text-muted-foreground text-xs tabular-nums"
        dateTime={new Date(deployment.deployedAt).toISOString()}
      >
        {when}
      </time>
    </li>
  );
}
