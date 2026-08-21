import type { PromptSummary } from "@anpord/schema/domain/prompts";
import { ListRow } from "@/components/layout/list-row";
import { PromptEditorAvatar } from "@/components/prompts/prompt-editor-avatar";
import { useRelativeTime } from "@/lib/use-relative-time";

export function PromptRow({ prompt }: { readonly prompt: PromptSummary }) {
  const updated = useRelativeTime(prompt.updatedAt);

  /** The serving version is what a caller of this prompt actually receives, so
   * it is the one worth showing; the highest version stands in only while
   * nothing has been published yet. */
  const version = prompt.productionVersion ?? prompt.latestVersion;

  return (
    <ListRow
      leading={<PromptEditorAvatar author={prompt.author} />}
      meta={
        <>
          {version === null ? null : (
            /* Quiet enough to read as an annotation on the name rather than a
               control beside it, which is what the outlined pill looked like. */
            <span className="w-8 text-right text-muted-foreground/70">
              v{version}
            </span>
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
      <span className="font-medium text-foreground">{prompt.name}</span>
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
