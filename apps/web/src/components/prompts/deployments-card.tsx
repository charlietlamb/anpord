import type { Deployment } from "@anpord/schema/domain/deployments";
import { ChannelBadge } from "@anpord/ui/components/ui/channel-badge";
import { ROW_DIVIDERS } from "@anpord/ui/lib/row-dividers";
import { cn } from "@anpord/ui/lib/utils";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { RailCard } from "@/components/prompts/rail-card";
import { listDeployments } from "@/lib/deployments-client";
import { deploymentKeys } from "@/lib/query/deployment-keys";
import { useChannelColor } from "@/lib/query/use-channel-colors";
import { useRelativeTime } from "@/lib/use-relative-time";

const RAIL_LIMIT = 5;

interface DeploymentsCardProps {
  readonly promptId: string;
}

export function DeploymentsCard({ promptId }: DeploymentsCardProps) {
  const deployments = useQuery({
    queryKey: [...deploymentKeys.list({ prompt: promptId }), RAIL_LIMIT],
    queryFn: () => listDeployments({ limit: RAIL_LIMIT, prompt: promptId }),
  });

  const rows = deployments.data ?? [];

  return (
    <RailCard
      action={
        rows.length === 0 ? null : (
          <Link
            className="text-muted-foreground text-xs hover:text-foreground hover:underline"
            to="/deployments"
          >
            All
          </Link>
        )
      }
      className="px-0 py-0"
      title="Deployments"
    >
      <DeploymentsCardBody isPending={deployments.isPending} rows={rows} />
    </RailCard>
  );
}

interface DeploymentsCardBodyProps {
  readonly isPending: boolean;
  readonly rows: readonly Deployment[];
}

function DeploymentsCardBody({ isPending, rows }: DeploymentsCardBodyProps) {
  if (isPending) {
    return (
      <p className="px-3.5 py-3 text-muted-foreground text-xs">Loading…</p>
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
    <div className={cn("flex flex-col", ROW_DIVIDERS)}>
      {rows.map((deployment) => (
        <CardRow deployment={deployment} key={deployment.id} />
      ))}
    </div>
  );
}

function CardRow({ deployment }: { readonly deployment: Deployment }) {
  const when = useRelativeTime(deployment.deployedAt);
  const channelColor = useChannelColor();

  return (
    <div className="flex items-center gap-2 px-3.5 py-2.5">
      <ChannelBadge
        color={channelColor(deployment.channel)}
        name={deployment.channel}
        size="xs"
      />

      <span className="flex items-center gap-1 text-muted-foreground text-xs tabular-nums">
        {deployment.fromVersion === null ? null : (
          <>
            <span>v{deployment.fromVersion}</span>
            <ArrowRightIcon aria-hidden="true" size={10} weight="bold" />
          </>
        )}
        <span className="text-foreground/80">v{deployment.toVersion}</span>
      </span>

      <time
        className="ml-auto shrink-0 text-muted-foreground text-xs tabular-nums"
        dateTime={new Date(deployment.deployedAt).toISOString()}
      >
        {when}
      </time>
    </div>
  );
}
