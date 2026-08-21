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
        <>
          <ChannelDot color={live ? channelColor(PRODUCTION) : undefined} />
          {/* Fixed width so the names beside them start on one line rather
              than stepping in and out with the length of each handle. */}
          <span className="w-40 shrink-0 truncate font-mono text-muted-foreground/70 text-xs">
            {prompt.id}
          </span>
        </>
      }
      meta={
        <>
          <span className="w-8 text-right">
            {live ? `v${prompt.productionVersion}` : null}
          </span>
          <span className="w-24 text-right">{updated}</span>
        </>
      }
      params={{ id: prompt.id }}
      to="/prompts/$id"
    >
      <span className="text-foreground">{prompt.name}</span>
      {prompt.description ? (
        <span className="ml-2 text-muted-foreground/70">
          {prompt.description}
        </span>
      ) : null}
    </ListRow>
  );
}
