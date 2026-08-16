import type { PromptSummary } from "@anpord/schema/domain/prompts";
import { PRODUCTION } from "@anpord/schema/domain/prompts";
import { Badge } from "@anpord/ui/components/ui/badge";
import { ChannelBadge } from "@anpord/ui/components/ui/channel-badge";
import { Link } from "@tanstack/react-router";
import { useChannelColor } from "@/lib/query/use-channel-colors";
import { useRelativeTime } from "@/lib/use-relative-time";

/** A prompt with no production channel has never been served, which is a
 * different state from one whose latest version simply isn't live yet. */
function LiveBadge({ prompt }: { readonly prompt: PromptSummary }) {
  const channelColor = useChannelColor();

  if (prompt.productionVersion === null) {
    return (
      <Badge size="sm" variant="outline">
        Draft
      </Badge>
    );
  }

  return (
    <ChannelBadge
      color={channelColor(PRODUCTION)}
      name={PRODUCTION}
      version={prompt.productionVersion}
    />
  );
}

export function PromptRow({ prompt }: { readonly prompt: PromptSummary }) {
  const updated = useRelativeTime(prompt.updatedAt);
  /** Only worth saying when it differs from what production serves. */
  const ahead =
    prompt.latestVersion !== null &&
    prompt.latestVersion !== prompt.productionVersion;

  return (
    <Link
      className="flex flex-col gap-1.5 px-4 py-3.5 transition-colors hover:bg-muted"
      params={{ id: prompt.id }}
      to="/prompts/$id"
    >
      <span className="flex items-center gap-2.5">
        <span className="min-w-0 flex-1 truncate font-medium text-sm">
          {prompt.name}
        </span>
        <LiveBadge prompt={prompt} />
      </span>

      <span className="flex min-w-0 items-baseline gap-2">
        <span className="truncate font-mono text-muted-foreground text-xs">
          {prompt.id}
        </span>
      </span>

      {prompt.description ? (
        <span className="line-clamp-1 text-foreground/70 text-xs leading-relaxed">
          {prompt.description}
        </span>
      ) : null}

      <span className="flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
        {ahead ? <span>v{prompt.latestVersion} latest</span> : null}
        {ahead && updated ? <span aria-hidden>·</span> : null}
        {updated ? <span>updated {updated}</span> : null}
      </span>
    </Link>
  );
}
