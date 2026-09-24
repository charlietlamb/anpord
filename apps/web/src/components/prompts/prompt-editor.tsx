import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { extractVariables } from "@anpord/template/extract";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PromptActivityFeed } from "@/components/prompts/prompt-activity-feed";
import { PromptComposer } from "@/components/prompts/prompt-composer";
import { PromptEditorActions } from "@/components/prompts/prompt-editor-actions";
import { PromptEditorLayout } from "@/components/prompts/prompt-editor-layout";
import { PromptEditorMain } from "@/components/prompts/prompt-editor-main";
import { PromptEditorTitle } from "@/components/prompts/prompt-editor-title";
import { PromptRail } from "@/components/prompts/prompt-rail";
import { useDialog } from "@/lib/dialog/dialogs";
import { channelQueries } from "@/lib/query/channel-queries";
import { promptQueries } from "@/lib/query/prompt-queries";
import { usePointChannel } from "@/lib/use-point-channel";
import { usePromptSelection } from "@/lib/use-prompt-selection";
import { useSaveVersion } from "@/lib/use-save-version";

interface PromptEditorProps {
  readonly id: string;
  readonly latest: ResolvedPrompt;
  readonly versions: readonly ResolvedPrompt[];
}

export function PromptEditor({ id, latest, versions }: PromptEditorProps) {
  const { open: openDialog } = useDialog();
  const channels = useQuery(promptQueries.channels(id));
  const definedChannels = useQuery(channelQueries.list());
  const placements = channels.data ?? [];

  const selection = usePromptSelection(versions, latest);
  const onPoint = usePointChannel(id, placements);

  const { save, saving, servedBy } = useSaveVersion({
    onOverwritten: selection.onView,
    onSaved: selection.reset,
    placements,
    promptId: id,
  });

  const editFrom = (from: ResolvedPrompt) => {
    selection.onEditFrom(from);
    toast.success(`Editing from v${from.version}`, {
      description: "Save to add it as a new version.",
    });
  };

  const onEditRequest = () => {
    if (selection.editing) {
      return;
    }
    openDialog("editVersion", {
      onCorrect: () => selection.onCorrect(selection.viewed.version),
      onEditFrom: () => editFrom(selection.viewed),
      servedBy: servedBy(selection.viewed.version),
      version: selection.viewed.version,
    });
  };

  const correctingVersion = selection.correcting
    ? selection.viewed.version
    : null;

  return (
    <PromptEditorLayout>
      <PromptEditorMain>
        <PromptEditorTitle
          correctingVersion={correctingVersion}
          dirty={selection.dirty}
          name={latest.name}
          promptId={latest.id}
          viewingVersion={selection.editing ? null : selection.viewed.version}
        />

        <PromptComposer
          content={selection.content}
          onContentChange={selection.onType}
          onEditRequest={onEditRequest}
          readOnly={!selection.editing}
        />

        <PromptActivityFeed promptId={id} />
      </PromptEditorMain>

      <PromptRail
        actions={
          <PromptEditorActions
            correctingVersion={correctingVersion}
            dirty={selection.dirty}
            onCancelCorrection={selection.onCancelCorrection}
            onSave={() => save(selection.submitted, correctingVersion)}
            promptId={latest.id}
            saving={saving}
          />
        }
        channels={definedChannels.data ?? []}
        onEditFrom={editFrom}
        onPromote={onPoint}
        onSelect={(version) => selection.onView(version.version)}
        placements={placements}
        variables={extractVariables(selection.content)}
        versions={versions}
        viewed={selection.viewed}
      />
    </PromptEditorLayout>
  );
}
