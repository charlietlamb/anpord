import type { Deployment } from "@anpord/schema/domain/deployments";
import { ChannelDot } from "@anpord/ui/components/ui/channel-dot";
import { useQuery } from "@tanstack/react-query";
import { VersionMove } from "@/components/deployments/version-move";
import { RailSection } from "@/components/rail/rail-section";
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
    <RailSection title="History">
      <DeploymentsCardBody
        failed={deployments.isError}
        isPending={deployments.isPending}
        rows={rows}
      />
    </RailSection>
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
    return <p className="py-1 text-muted-foreground text-xs">Loading…</p>;
  }

  /** Distinct from the empty state below, which would otherwise claim the
   * prompt has never been deployed when the request simply failed. */
  if (failed) {
    return (
      <p className="py-1 text-muted-foreground text-xs">
        Couldn't load deployments.
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="py-1 text-muted-foreground text-xs">Not deployed yet.</p>
    );
  }

  return (
    <ul aria-label="Recent deployments" className="flex flex-col">
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
    <li className="flex h-7 items-center gap-2 text-muted-foreground">
      <ChannelDot color={channelColor(deployment.channel)} />
      <span className="truncate text-label">{deployment.channel}</span>

      <VersionMove
        className="gap-1 text-label"
        from={deployment.fromVersion}
        to={deployment.toVersion}
      />

      <time
        className="ml-auto shrink-0 whitespace-nowrap text-xs tabular-nums opacity-60"
        dateTime={new Date(deployment.deployedAt).toISOString()}
      >
        {when}
      </time>
    </li>
  );
}
