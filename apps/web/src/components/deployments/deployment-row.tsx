import type { Deployment } from "@anpord/schema/domain/deployments";
import { ChannelBadge } from "@anpord/ui/components/ui/channel-badge";
import { initials } from "@anpord/ui/lib/initials";
import { Link } from "@tanstack/react-router";
import { IdentityAvatar } from "@/components/dashboard/sidebar-identity";
import { DeploymentKindBadge } from "@/components/deployments/deployment-kind-badge";
import { VersionMove } from "@/components/deployments/version-move";
import { useChannelColor } from "@/lib/query/use-channel-colors";
import { useRelativeTime } from "@/lib/use-relative-time";

interface DeploymentRowProps {
  readonly deployment: Deployment;
}

export function DeploymentRow({ deployment }: DeploymentRowProps) {
  const when = useRelativeTime(deployment.deployedAt);
  const channelColor = useChannelColor();

  return (
    <li className="flex items-center gap-3 px-4 py-3">
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
    </li>
  );
}
