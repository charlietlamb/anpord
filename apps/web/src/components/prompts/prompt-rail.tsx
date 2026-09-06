import type { Channel } from "@anpord/schema/domain/channels";
import type {
  ChannelPlacement,
  ResolvedPrompt,
} from "@anpord/schema/domain/prompts";
import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { RAIL_FRAME } from "@anpord/ui/lib/rail-frame";
import type { ReactNode } from "react";
import { PromptDetails } from "@/components/prompts/prompt-details";
import { PromptVariables } from "@/components/prompts/prompt-variables";
import { VersionList } from "@/components/prompts/version-list";

interface PromptRailProps {
  readonly actions: ReactNode;
  readonly channels: readonly Channel[];
  readonly onEditFrom: (version: ResolvedPrompt) => void;
  readonly onPromote: (channel: string, version: number) => void;
  readonly onSelect: (version: ResolvedPrompt) => void;
  readonly placements: readonly ChannelPlacement[];
  readonly variables: readonly string[];
  readonly versions: readonly ResolvedPrompt[];
  readonly viewed: ResolvedPrompt;
}

export function PromptRail({
  actions,
  channels,
  onEditFrom,
  onPromote,
  onSelect,
  placements,
  variables,
  versions,
  viewed,
}: PromptRailProps) {
  const oldest = versions.at(-1) ?? viewed;

  /* Its own scrollbar is hidden so the page keeps the only one on screen. */
  return (
    <aside className={RAIL_FRAME}>
      <div className="flex justify-end">{actions}</div>

      <PromptDetails created={oldest.createdAt} viewed={viewed} />

      <RailSection
        action={
          <span className="text-muted-foreground text-xs tabular-nums">
            {versions.length}
          </span>
        }
        title="Versions"
      >
        <VersionList
          channels={channels}
          onEditFrom={onEditFrom}
          onPromote={onPromote}
          onSelect={onSelect}
          placements={placements}
          versions={versions}
          viewedVersion={viewed.version}
        />
      </RailSection>

      <PromptVariables variables={variables} />
    </aside>
  );
}
