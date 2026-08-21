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
        prompt.author ? (
          <IdentityAvatar
            className="size-5 shrink-0 rounded-full after:rounded-full"
            fallbackClassName="rounded-full text-[0.5rem]"
            image={prompt.author.image}
            label={prompt.author.name}
            text={initials(prompt.author.name)}
          />
        ) : (
          /* Holds the column open so the names beside it stay on one line when
             a prompt's last editor has been deleted. */
          <span aria-hidden="true" className="size-5 shrink-0" />
        )
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
          <span className="w-24 whitespace-nowrap text-right">{updated}</span>
        </>
      }
      params={{ id: prompt.id }}
      to="/prompts/$id"
    >
      {/* The name leads and the handle trails it, both flush left: the name is
          what a reader is looking for, and the handle is how they address it
          once found. */}
      <span className="text-foreground">{prompt.name}</span>
      <span className="ml-2.5 font-mono text-muted-foreground/60 text-xs">
        {prompt.id}
      </span>
      {prompt.description ? (
        <span className="ml-2.5 text-muted-foreground/70">
          {prompt.description}
        </span>
      ) : null}
    </ListRow>
  );
}
