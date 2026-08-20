import type { Channel } from "@anpord/schema/domain/channels";
import type {
  ChannelPlacement,
  ResolvedPrompt,
} from "@anpord/schema/domain/prompts";
import type { ReactNode } from "react";
import { DetailsCard } from "@/components/prompts/details-card";
import { VariablesCard } from "@/components/prompts/variables-card";
import { VersionList } from "@/components/prompts/version-list";
import { RailSection } from "@/components/rail/rail-section";

interface PromptRailProps {
  /** What acts on the prompt, carried at the head of the rail. */
  readonly actions: ReactNode;
  /** Every channel the organisation defines, so any version can be sent to one. */
  readonly channels: readonly Channel[];
  readonly onEditFrom: (version: ResolvedPrompt) => void;
  readonly onPromote: (channel: string, version: number) => void;
  readonly onSelect: (version: ResolvedPrompt) => void;
  /** Where each channel points today. */
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
          channels={channels}
          onEditFrom={onEditFrom}
          onPromote={onPromote}
          onSelect={onSelect}
          placements={placements}
          versions={versions}
          viewedVersion={viewed.version}
        />
      </RailSection>

      <VariablesCard variables={variables} />
    </aside>
  );
}
