import type { PromptSummary } from "@anpord/schema/domain/prompts";
import { Badge } from "@anpord/ui/components/ui/badge";
import { initials } from "@anpord/ui/lib/initials";
import { IdentityAvatar } from "@/components/dashboard/sidebar-identity";
import { ListRow } from "@/components/layout/list-row";
import { useRelativeTime } from "@/lib/use-relative-time";

export function PromptRow({ prompt }: { readonly prompt: PromptSummary }) {
  const updated = useRelativeTime(prompt.updatedAt);

  /** The serving version is what a caller of this prompt actually receives, so
   * it is the one worth showing; the highest version stands in only while
   * nothing has been published yet. */
  const version = prompt.productionVersion ?? prompt.latestVersion;

  return (
    <ListRow
      leading={
        /* Fixed width so the names beside them start on one line rather than
           stepping in and out with the length of each handle. */
        <span className="w-44 shrink-0 truncate font-mono text-muted-foreground/70 text-xs">
          {prompt.id}
        </span>
      }
      meta={
        <>
          {version === null ? null : (
            <Badge
              className="border-border-faint bg-transparent font-normal text-muted-foreground shadow-none"
              size="xs"
              variant="outline"
            >
              v{version}
            </Badge>
          )}
          <span className="w-16 text-right">{updated}</span>
          {prompt.author ? (
            <IdentityAvatar
              className="size-5 rounded-full after:rounded-full"
              fallbackClassName="rounded-full text-[0.5rem]"
              image={prompt.author.image}
              label={prompt.author.name}
              text={initials(prompt.author.name)}
            />
          ) : (
            /* Holds the column open so the timestamps above and below stay on
               one line when a prompt's last editor has been deleted. */
            <span aria-hidden="true" className="size-5" />
          )}
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
