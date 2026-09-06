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

  /* The serving version is what callers receive; the highest stands in until one is published. */
  const version = prompt.productionVersion ?? prompt.latestVersion;

  return (
    <ListRow
      actions={<PromptRowActions id={prompt.id} />}
      leading={<PromptEditorAvatar author={prompt.author} />}
      meta={
        <>
          {version === null ? null : (
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
