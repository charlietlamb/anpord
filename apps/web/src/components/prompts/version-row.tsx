import type { Channel } from "@anpord/schema/domain/channels";
import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { ChannelDot } from "@anpord/ui/components/ui/channel-dot";
import { ListRow } from "@/components/layout/list-row";
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
    <ListRow
      actions={
        <VersionActions
          channels={channels}
          onEditFrom={onEditFrom}
          onPromote={onPromote}
          servedBy={servedBy}
          version={version.version}
        />
      }
      leading={
        <ChannelDot
          color={version.channel ? channelColor(version.channel) : undefined}
        />
      }
      meta={
        <time dateTime={new Date(version.createdAt).toISOString()}>{when}</time>
      }
      onSelect={onSelect}
      role="option"
      selected={viewing}
    >
      <span className="mr-2 tabular-nums">v{version.version}</span>
      {label}
    </ListRow>
  );
}
