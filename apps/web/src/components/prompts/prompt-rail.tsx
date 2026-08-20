import type {
  ChannelPlacement,
  ResolvedPrompt,
} from "@anpord/schema/domain/prompts";
import { PRODUCTION } from "@anpord/schema/domain/prompts";
import { Button } from "@anpord/ui/components/button";
import { ArrowCounterClockwiseIcon, ArrowUpIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { ChannelsCard } from "@/components/prompts/channels-card";
import { DeploymentsCard } from "@/components/prompts/deployments-card";
import { DetailsCard } from "@/components/prompts/details-card";
import { VariablesCard } from "@/components/prompts/variables-card";
import { VersionList } from "@/components/prompts/version-list";
import { RailSection } from "@/components/rail/rail-section";

interface PromptRailProps {
  /** What acts on the prompt, carried at the head of the rail. */
  readonly actions: ReactNode;
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
  actions,
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

  /* Held in view while the prompt scrolls past it. Capped to the screen so a
     rail longer than the viewport can still reach its end, and its own
     scrollbar hidden so the page keeps the only one on screen. */
  return (
    <aside className="no-scrollbar order-2 flex flex-col gap-6 lg:sticky lg:top-0 lg:h-svh lg:overflow-y-auto lg:overflow-x-clip lg:overscroll-contain lg:pt-5 lg:pb-8">
      <div className="flex justify-end">{actions}</div>

      <DetailsCard created={oldest.createdAt} viewed={viewed} />

      <RailSection
        action={
          <span className="text-muted-foreground text-xs tabular-nums">
            {versions.length}
          </span>
        }
        title="Versions"
      >
        <VersionList
          onSelect={onSelect}
          versions={versions}
          viewedVersion={viewed.version}
        />
        {editing ? null : (
          <div className="mt-2 flex gap-1.5">
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
      </RailSection>

      <ChannelsCard
        channels={channels}
        onAddChannel={onAddChannel}
        onPoint={onPoint}
        pending={channelsPending}
        pointing={pointing}
        versions={versions}
      />

      <DeploymentsCard promptId={viewed.id} />

      <VariablesCard variables={variables} />
    </aside>
  );
}
