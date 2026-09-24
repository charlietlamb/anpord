import type { PromptSummary } from "@anpord/schema/domain/prompts";
import { DataTableRow } from "@anpord/ui/components/ui/data-table";
import { Link } from "@tanstack/react-router";
import { LINKED_ROW, ROW_LINK } from "@/components/layout/row-link";
import { PromptEditorAvatar } from "@/components/prompts/prompt-editor-avatar";
import { PromptRowActions } from "@/components/prompts/prompt-row-actions";
import { useRelativeTime } from "@/lib/use-relative-time";

export function PromptRow({ prompt }: { readonly prompt: PromptSummary }) {
  const updated = useRelativeTime(prompt.updatedAt);
  const version = prompt.productionVersion ?? prompt.latestVersion;

  return (
    <DataTableRow className={LINKED_ROW}>
      <span className="flex min-w-0 items-center gap-2.5">
        <PromptEditorAvatar author={prompt.author} />
        <Link className={ROW_LINK} params={{ id: prompt.id }} to="/prompts/$id">
          {prompt.name}
        </Link>
        <span className="shrink-0 font-mono text-muted-foreground text-xs">
          {prompt.id}
        </span>
        {prompt.description ? (
          <span className="truncate text-muted-foreground">
            {prompt.description}
          </span>
        ) : null}
      </span>

      <span className="text-muted-foreground tabular-nums">
        {version === null ? "—" : `v${version}`}
      </span>

      <span className="truncate text-muted-foreground tabular-nums">
        {updated}
      </span>

      <PromptRowActions id={prompt.id} />
    </DataTableRow>
  );
}
