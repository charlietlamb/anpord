import type {
  ChannelPlacement,
  ResolvedPrompt,
} from "@anpord/schema/domain/prompts";
import { Button } from "@anpord/ui/components/button";
import { Badge } from "@anpord/ui/components/ui/badge";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { ChannelsCard } from "@/components/prompts/channels-card";
import { DetailsCard } from "@/components/prompts/details-card";
import { RailCard } from "@/components/prompts/rail-card";
import { UsageCard } from "@/components/prompts/usage-card";
import { VariablesCard } from "@/components/prompts/variables-card";
import { VersionList } from "@/components/prompts/version-list";

interface PromptRailProps {
  readonly channels: readonly ChannelPlacement[];
  readonly editing: boolean;
  readonly onEditFrom: () => void;
  readonly onPromote: (channel: string) => void;
  readonly onSelect: (version: ResolvedPrompt) => void;
  readonly promoting: boolean;
  readonly variables: readonly string[];
  readonly versions: readonly ResolvedPrompt[];
  readonly viewed: ResolvedPrompt;
}

export function PromptRail({
  channels,
  editing,
  onPromote,
  onEditFrom,
  onSelect,
  promoting,
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
          <div className="px-3 pt-1.5 pb-3">
            <Button
              className="w-full"
              onClick={onEditFrom}
              size="sm"
              variant="outline"
            >
              <ArrowCounterClockwiseIcon size={15} />
              Edit from v{viewed.version}
            </Button>
          </div>
        )}
      </RailCard>

      <ChannelsCard
        channels={channels}
        onPromote={onPromote}
        promoting={promoting}
        viewed={viewed}
      />

      <DetailsCard created={oldest.createdAt} viewed={viewed} />

      <VariablesCard variables={variables} />

      <UsageCard promptId={viewed.id} />
    </aside>
  );
}
