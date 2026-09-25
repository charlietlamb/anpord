import type { PromptSummary } from "@anpord/schema/domain/prompts";
import {
  DataTableRow,
  DataTableRowLink,
} from "@anpord/ui/components/ui/data-table";
import { useRelativeTime } from "@anpord/ui/hooks/use-relative-time";
import { Link } from "@tanstack/react-router";
import { PromptEditorAvatar } from "@/components/prompts/prompt-editor-avatar";
import { PromptRowActions } from "@/components/prompts/prompt-row-actions";

export function PromptRow({ prompt }: { readonly prompt: PromptSummary }) {
  const updated = useRelativeTime(prompt.updatedAt);
  const version = prompt.productionVersion ?? prompt.latestVersion;

  return (
    <DataTableRow linked>
      <span className="flex min-w-0 items-center gap-2.5">
        <PromptEditorAvatar author={prompt.author} />
        <DataTableRowLink
          render={<Link params={{ id: prompt.id }} to="/prompts/$id" />}
        >
          {prompt.name}
        </DataTableRowLink>
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
