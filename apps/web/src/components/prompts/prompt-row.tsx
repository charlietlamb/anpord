import type { PromptSummary } from "@anpord/schema/domain/prompts";
import type { Ref } from "react";
import { ListRow, RowTitle } from "@/components/layout/list-row";
import { PromptEditorAvatar } from "@/components/prompts/prompt-editor-avatar";
import { PromptRowActions } from "@/components/prompts/prompt-row-actions";
import { useRelativeTime } from "@/lib/use-relative-time";

interface PromptRowProps {
  readonly onMouseEnter?: () => void;
  readonly prompt: PromptSummary;
  readonly ref?: Ref<HTMLElement>;
  readonly tabIndex?: number;
}

export function PromptRow({
  onMouseEnter,
  prompt,
  ref,
  tabIndex,
}: PromptRowProps) {
  const updated = useRelativeTime(prompt.updatedAt);

  /** The serving version is what a caller of this prompt actually receives, so
   * it is the one worth showing; the highest version stands in only while
   * nothing has been published yet. */
  const version = prompt.productionVersion ?? prompt.latestVersion;

  return (
    <ListRow
      actions={<PromptRowActions id={prompt.id} />}
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
      onMouseEnter={onMouseEnter}
      params={{ id: prompt.id }}
      ref={ref}
      tabIndex={tabIndex}
      to="/prompts/$id"
    >
      {/* The name leads and the handle trails it, both flush left: the name is
          what a reader is looking for, and the handle is how they address it
          once found. */}
      <RowTitle>{prompt.name}</RowTitle>
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
