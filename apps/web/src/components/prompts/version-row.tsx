import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { Button } from "@anpord/ui/components/button";
import { ChannelDot } from "@anpord/ui/components/ui/channel-dot";
import { cn } from "@anpord/ui/lib/utils";
import { useChannelColor } from "@/lib/query/use-channel-colors";
import { useRelativeTime } from "@/lib/use-relative-time";

const MARKDOWN_PREFIX = /^\s*(?:#{1,6}\s+|[*-]\s+|>\s*)/;
const EMPHASIS = /[*_`]/g;

const preview = (content: string) =>
  content
    .trim()
    .split("\n")[0]
    ?.replace(MARKDOWN_PREFIX, "")
    .replace(EMPHASIS, "") ?? "";

interface VersionRowProps {
  readonly onSelect: () => void;
  readonly version: ResolvedPrompt;
  readonly viewing: boolean;
}

/**
 * One line per version. A dot carries the channel, the number anchors the row,
 * and the message fills what is left — so the list scans down its left edge
 * rather than asking the eye to step over a badge on every row.
 */
export function VersionRow({ onSelect, version, viewing }: VersionRowProps) {
  const when = useRelativeTime(version.createdAt);
  const channelColor = useChannelColor();
  const label = version.commitMessage ?? preview(version.content);

  return (
    <Button
      aria-selected={viewing}
      className={cn(
        "h-7 w-full justify-start gap-2 rounded-md px-2 font-normal",
        viewing ? "bg-muted text-foreground" : "text-muted-foreground"
      )}
      onClick={onSelect}
      role="option"
      variant="ghost"
    >
      <ChannelDot
        color={version.channel ? channelColor(version.channel) : undefined}
      />

      <span
        className={cn(
          "shrink-0 text-label tabular-nums",
          viewing && "font-medium"
        )}
      >
        v{version.version}
      </span>

      <span className="min-w-0 flex-1 truncate text-left text-label">
        {label}
      </span>

      <time
        className="shrink-0 text-xs tabular-nums opacity-60"
        dateTime={new Date(version.createdAt).toISOString()}
      >
        {when}
      </time>
    </Button>
  );
}
