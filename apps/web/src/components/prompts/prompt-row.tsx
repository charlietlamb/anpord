import type { PromptSummary } from "@anpord/schema/domain/prompts";
import { PRODUCTION } from "@anpord/schema/domain/prompts";
import { ChannelDot } from "@anpord/ui/components/ui/channel-dot";
import { ListRow } from "@/components/layout/list-row";
import { useChannelColor } from "@/lib/query/use-channel-colors";
import { useRelativeTime } from "@/lib/use-relative-time";

export function PromptRow({ prompt }: { readonly prompt: PromptSummary }) {
  const updated = useRelativeTime(prompt.updatedAt);
  const channelColor = useChannelColor();

  /** A prompt with no production channel has never been served, which is a
   * different state from one whose latest version simply isn't live yet. */
  const live = prompt.productionVersion !== null;

  return (
    <ListRow
      leading={
        <ChannelDot color={live ? channelColor(PRODUCTION) : undefined} />
      }
      meta={updated}
      params={{ id: prompt.id }}
      to="/prompts/$id"
    >
      <span className="text-foreground">{prompt.name}</span>
      <span className="ml-2 font-mono text-xs opacity-60">{prompt.id}</span>
      {live ? (
        <span className="ml-2 text-xs tabular-nums opacity-60">
          v{prompt.productionVersion}
        </span>
      ) : null}
    </ListRow>
  );
}
