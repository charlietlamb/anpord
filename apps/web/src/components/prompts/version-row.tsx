import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { Button } from "@anpord/ui/components/button";
import { Badge } from "@anpord/ui/components/ui/badge";
import { initials } from "@anpord/ui/lib/initials";
import { cn } from "@anpord/ui/lib/utils";
import { IdentityAvatar } from "@/components/dashboard/sidebar-identity";
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

export function VersionRow({ onSelect, version, viewing }: VersionRowProps) {
  const when = useRelativeTime(version.createdAt);
  const label = version.commitMessage ?? preview(version.content);

  return (
    <Button
      aria-selected={viewing}
      className={cn(
        "h-auto w-full flex-col items-stretch gap-1 rounded-none border-border-surface border-b px-3.5 py-2.5 text-left last:border-b-0",
        viewing
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "hover:bg-sidebar-accent/60"
      )}
      onClick={onSelect}
      role="option"
      variant="ghost"
    >
      <span className="flex items-baseline gap-2">
        <span className="font-medium text-[0.8125rem] tabular-nums">
          v{version.version}
        </span>
        {version.channel ? (
          <Badge size="xs" variant="secondary">
            {version.channel}
          </Badge>
        ) : null}
      </span>

      <span className="line-clamp-2 text-[0.8125rem] text-foreground/80 leading-snug">
        {label}
      </span>

      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
        {version.author ? (
          <IdentityAvatar
            className="size-4"
            fallbackClassName="text-[0.5rem]"
            image={version.author.image}
            label={version.author.name}
            text={initials(version.author.name)}
          />
        ) : null}
        <time
          className="tabular-nums"
          dateTime={new Date(version.createdAt).toISOString()}
        >
          {when}
        </time>
      </span>
    </Button>
  );
}
