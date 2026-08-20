import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { CopyableId } from "@anpord/ui/components/ui/copyable-id";
import { initials } from "@anpord/ui/lib/initials";
import {
  ClockCounterClockwiseIcon,
  FloppyDiskIcon,
  HashIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { IdentityAvatar } from "@/components/dashboard/sidebar-identity";
import { DetailRow } from "@/components/prompts/detail-row";
import { RailSection } from "@/components/rail/rail-section";
import { useRelativeTime } from "@/lib/use-relative-time";

interface DetailsCardProps {
  readonly created: Date;
  readonly viewed: ResolvedPrompt;
}

export function DetailsCard({ created, viewed }: DetailsCardProps) {
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

      {viewed.author ? (
        <DetailRow icon={UserIcon} label="Author">
          <span className="flex items-center gap-1.5">
            <IdentityAvatar
              className="size-4"
              fallbackClassName="text-[0.5rem]"
              image={viewed.author.image}
              label={viewed.author.name}
              text={initials(viewed.author.name)}
            />
            <span className="truncate">{viewed.author.name}</span>
          </span>
        </DetailRow>
      ) : null}
    </RailSection>
  );
}
