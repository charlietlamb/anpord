import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { CopyableId } from "@anpord/ui/components/ui/copyable-id";
import { initials } from "@anpord/ui/lib/initials";
import { IdentityAvatar } from "@/components/dashboard/sidebar-identity";
import { DetailRow } from "@/components/prompts/detail-row";
import { RailCard } from "@/components/rail/rail-card";
import { useRelativeTime } from "@/lib/use-relative-time";

interface DetailsCardProps {
  readonly created: Date;
  readonly viewed: ResolvedPrompt;
}

export function DetailsCard({ created, viewed }: DetailsCardProps) {
  const createdLabel = useRelativeTime(created);
  const savedLabel = useRelativeTime(viewed.createdAt);

  return (
    <RailCard className="grid gap-2.5" title="Details">
      <DetailRow label="Identifier">
        <CopyableId value={viewed.id} />
      </DetailRow>
      <DetailRow label="Created">
        <time
          className="tabular-nums"
          dateTime={new Date(created).toISOString()}
        >
          {createdLabel}
        </time>
      </DetailRow>
      <DetailRow label="Last saved">
        <time
          className="tabular-nums"
          dateTime={new Date(viewed.createdAt).toISOString()}
        >
          {savedLabel}
        </time>
      </DetailRow>
      {viewed.author ? (
        <DetailRow label="Author">
          <span className="flex items-center justify-end gap-1.5">
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
    </RailCard>
  );
}
