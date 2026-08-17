import type { Deployment } from "@anpord/schema/domain/deployments";
import { ChannelBadge } from "@anpord/ui/components/ui/channel-badge";
import { initials } from "@anpord/ui/lib/initials";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { IdentityAvatar } from "@/components/dashboard/sidebar-identity";
import { DeploymentKindBadge } from "@/components/deployments/deployment-kind-badge";
import { useChannelColor } from "@/lib/query/use-channel-colors";
import { useRelativeTime } from "@/lib/use-relative-time";

interface DeploymentRowProps {
  readonly deployment: Deployment;
}

export function DeploymentRow({ deployment }: DeploymentRowProps) {
  const when = useRelativeTime(deployment.deployedAt);
  const channelColor = useChannelColor();

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <Link
            className="truncate font-medium text-[0.8125rem] hover:underline"
            params={{ id: deployment.promptId }}
            to="/prompts/$id"
          >
            {deployment.promptName}
          </Link>
          <ChannelBadge
            color={channelColor(deployment.channel)}
            name={deployment.channel}
            size="xs"
          />
        </div>

        <VersionMove from={deployment.fromVersion} to={deployment.toVersion} />
      </div>

      <DeploymentKindBadge kind={deployment.kind} />

      {deployment.deployedBy ? (
        <IdentityAvatar
          className="size-5 shrink-0"
          fallbackClassName="text-[0.5rem]"
          image={deployment.deployedBy.image}
          label={deployment.deployedBy.name}
          text={initials(deployment.deployedBy.name)}
        />
      ) : null}

      <time
        className="w-20 shrink-0 text-right text-muted-foreground text-xs tabular-nums"
        dateTime={new Date(deployment.deployedAt).toISOString()}
      >
        {when}
      </time>
    </div>
  );
}

interface VersionMoveProps {
  readonly from: number | null;
  readonly to: number;
}

function VersionMove({ from, to }: VersionMoveProps) {
  if (from === null) {
    return (
      <span className="text-muted-foreground text-xs tabular-nums">v{to}</span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
      <span>v{from}</span>
      <ArrowRightIcon aria-hidden="true" size={11} weight="bold" />
      <span className="text-foreground/80">v{to}</span>
    </span>
  );
}
