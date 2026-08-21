import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { CopyableId } from "@anpord/ui/components/ui/copyable-id";
import { initials } from "@anpord/ui/lib/initials";
import {
  ClockCounterClockwiseIcon,
  FloppyDiskIcon,
  HashIcon,
} from "@phosphor-icons/react";
import { IdentityAvatar } from "@/components/dashboard/sidebar-identity";
import { DetailRow } from "@/components/prompts/detail-row";
import { DetailRowFrame } from "@/components/prompts/detail-row-frame";
import { RailSection } from "@/components/rail/rail-section";
import { useRelativeTime } from "@/lib/use-relative-time";

interface PromptDetailsProps {
  readonly created: Date;
  readonly viewed: ResolvedPrompt;
}

export function PromptDetails({ created, viewed }: PromptDetailsProps) {
  const createdLabel = useRelativeTime(created);
  const savedLabel = useRelativeTime(viewed.createdAt);

  return (
    <RailSection className="flex flex-col" title="Details">
      <DetailRow icon={HashIcon} label="Identifier">
        <CopyableId value={viewed.id} />
      </DetailRow>

      <DetailRow icon={ClockCounterClockwiseIcon} label="Created">
        <time
          className="tabular-nums"
          dateTime={new Date(created).toISOString()}
        >
          {createdLabel}
        </time>
      </DetailRow>

      <DetailRow icon={FloppyDiskIcon} label="Last saved">
        <time
          className="tabular-nums"
          dateTime={new Date(viewed.createdAt).toISOString()}
        >
          {savedLabel}
        </time>
      </DetailRow>

      {/* The face is the icon: a person's row does not need a glyph of a
          person beside their own picture. */}
      {viewed.author ? (
        <DetailRowFrame
          label="Author"
          marker={
            <IdentityAvatar
              className="size-4 shrink-0"
              fallbackClassName="text-[0.5rem]"
              image={viewed.author.image}
              label={viewed.author.name}
              text={initials(viewed.author.name)}
            />
          }
        >
          {viewed.author.name}
        </DetailRowFrame>
      ) : null}
    </RailSection>
  );
}
