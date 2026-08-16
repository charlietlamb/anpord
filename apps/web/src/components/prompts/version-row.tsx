import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
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
    <button
      aria-selected={viewing}
      className={cn(
        "flex w-full flex-col gap-1 rounded-lg border px-2.5 py-2 text-left outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        viewing
          ? "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground"
          : "border-transparent hover:bg-muted/50"
      )}
      onClick={onSelect}
      role="option"
      type="button"
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
    </button>
  );
}
