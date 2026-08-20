import type { Channel } from "@anpord/schema/domain/channels";
import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { Button } from "@anpord/ui/components/button";
import { ChannelDot } from "@anpord/ui/components/ui/channel-dot";
import { cn } from "@anpord/ui/lib/utils";
import { VersionActions } from "@/components/prompts/version-actions";
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
  readonly channels: readonly Channel[];
  readonly onEditFrom: () => void;
  readonly onPromote: (channel: string) => void;
  readonly onSelect: () => void;
  readonly servedBy: readonly string[];
  readonly version: ResolvedPrompt;
  readonly viewing: boolean;
}

/**
 * One line per version. A dot carries the channel, the number anchors the row,
 * and the message fills what is left — so the list scans down its left edge
 * rather than asking the eye to step over a badge on every row.
 *
 * The menu sits over the row rather than inside it: a control within a control
 * is neither reachable by keyboard nor sound to nest.
 */
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
    <div className="group/version flex items-center">
      <Button
        aria-selected={viewing}
        className={cn(
          "h-7 min-w-0 flex-1 justify-start gap-2 rounded-md px-2",
          viewing ? "font-medium text-foreground" : "font-normal"
        )}
        onClick={onSelect}
        role="option"
        variant="bare"
      >
        <ChannelDot
          color={version.channel ? channelColor(version.channel) : undefined}
        />

        <span className="shrink-0 text-label tabular-nums">
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

      {/* Beside the row rather than over it, so the menu has its own column
          and the date it used to cover can stay. */}
      <div className="-mr-1 shrink-0">
        <VersionActions
          channels={channels}
          onEditFrom={onEditFrom}
          onPromote={onPromote}
          servedBy={servedBy}
          version={version.version}
        />
      </div>
    </div>
  );
}
