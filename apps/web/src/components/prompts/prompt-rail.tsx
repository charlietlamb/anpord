import type {
  ChannelPlacement,
  ResolvedPrompt,
} from "@anpord/schema/domain/prompts";
import { PRODUCTION } from "@anpord/schema/domain/prompts";
import { Button } from "@anpord/ui/components/button";
import { Badge } from "@anpord/ui/components/ui/badge";
import { ArrowCounterClockwiseIcon, ArrowUpIcon } from "@phosphor-icons/react";
import { ChannelsCard } from "@/components/prompts/channels-card";
import { DeploymentsCard } from "@/components/prompts/deployments-card";
import { DetailsCard } from "@/components/prompts/details-card";
import { RailCard } from "@/components/prompts/rail-card";
import { UsageCard } from "@/components/prompts/usage-card";
import { VariablesCard } from "@/components/prompts/variables-card";
import { VersionList } from "@/components/prompts/version-list";

interface PromptRailProps {
  readonly channels: readonly ChannelPlacement[];
  readonly channelsPending: boolean;
  readonly editing: boolean;
  readonly onAddChannel: () => void;
  readonly onEditFrom: () => void;
  readonly onPoint: (channel: string, version: number) => void;
  readonly onPromote: () => void;
  readonly onSelect: (version: ResolvedPrompt) => void;
  readonly pointing: boolean;
  readonly variables: readonly string[];
  readonly versions: readonly ResolvedPrompt[];
  readonly viewed: ResolvedPrompt;
}

export function PromptRail({
  channels,
  channelsPending,
  editing,
  onAddChannel,
  onPoint,
  onEditFrom,
  onPromote,
  onSelect,
  pointing,
  variables,
  versions,
  viewed,
}: PromptRailProps) {
  const oldest = versions.at(-1) ?? viewed;

  return (
    <aside className="order-2 flex min-h-0 flex-col gap-3 lg:overflow-y-auto lg:overscroll-contain">
      <RailCard
        action={
          <Badge className="tabular-nums" size="xs" variant="secondary">
            {versions.length}
          </Badge>
        }
        className="px-0 py-0"
        title="Versions"
      >
        <VersionList
          onSelect={onSelect}
          versions={versions}
          viewedVersion={viewed.version}
        />
        {editing ? null : (
          <div className="flex gap-1.5 px-3 pt-1.5 pb-3">
            <Button
              className="flex-1"
              onClick={onEditFrom}
              size="sm"
              variant="outline"
            >
              <ArrowCounterClockwiseIcon size={15} />
              Edit from v{viewed.version}
            </Button>
            {viewed.channel === PRODUCTION ? null : (
              <Button
                className="shrink-0"
                disabled={pointing}
                onClick={onPromote}
                size="sm"
                variant="outline"
              >
                <ArrowUpIcon size={15} weight="bold" />
                Promote
              </Button>
            )}
          </div>
        )}
      </RailCard>

      <ChannelsCard
        channels={channels}
        onAddChannel={onAddChannel}
        onPoint={onPoint}
        pending={channelsPending}
        pointing={pointing}
        versions={versions}
      />

      <DeploymentsCard promptId={viewed.id} />

      <DetailsCard created={oldest.createdAt} viewed={viewed} />

      <VariablesCard variables={variables} />

      <UsageCard promptId={viewed.id} />
    </aside>
  );
}
