import type { Channel } from "@anpord/schema/domain/channels";
import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { Button } from "@anpord/ui/components/button";
import { ChannelDot } from "@anpord/ui/components/ui/channel-dot";
import { useRelativeTime } from "@anpord/ui/hooks/use-relative-time";
import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import { VersionActions } from "@/components/prompts/version-actions";
import { useChannelColor } from "@/lib/query/use-channel-colors";

const MARKDOWN_PREFIX = /^\s*(?:#{1,6}\s+|[*-]\s+|>\s*)/;
const EMPHASIS = /[*_`]/g;

const preview = (content: string) =>
  content
    .trim()
    .split("\n")[0]
    ?.replace(MARKDOWN_PREFIX, "")
    .replace(EMPHASIS, "") ?? "";

interface VersionRowProps {
  readonly channels: readonly Channel[];
  readonly onEditFrom: () => void;
  readonly onPromote: (channel: string) => void;
  readonly onSelect: () => void;
  readonly servedBy: readonly string[];
  readonly version: ResolvedPrompt;
  readonly viewing: boolean;
}

export function VersionRow({
  channels,
  onEditFrom,
  onPromote,
  onSelect,
  servedBy,
  version,
  viewing,
}: VersionRowProps) {
  const when = useRelativeTime(version.createdAt);
  const channelColor = useChannelColor();
  const label = version.commitMessage ?? preview(version.content);

  return (
    <div
      className={cn(
        BLEED_ROW,
        "group/row flex items-center rounded-md transition-colors",
        viewing ? "bg-alpha-8" : "hover:bg-alpha-4"
      )}
      role="presentation"
    >
      <Button
        aria-selected={viewing}
        className={cn(
          "h-10 min-w-0 flex-1 justify-start gap-2.5 rounded-md px-2 text-label",
          viewing
            ? "font-medium text-foreground"
            : "font-normal text-muted-foreground"
        )}
        onClick={onSelect}
        role="option"
        variant="bare"
      >
        <ChannelDot
          color={version.channel ? channelColor(version.channel) : undefined}
        />
        <span className="min-w-0 flex-1 truncate text-left">
          <span className="mr-2 tabular-nums">v{version.version}</span>
          <span>{label}</span>
        </span>
        <time
          className="shrink-0 text-muted-foreground text-xs tabular-nums"
          dateTime={new Date(version.createdAt).toISOString()}
        >
          {when}
        </time>
      </Button>

      <VersionActions
        channels={channels}
        onEditFrom={onEditFrom}
        onPromote={onPromote}
        servedBy={servedBy}
        version={version.version}
      />
    </div>
  );
}
