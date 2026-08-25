import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { extractVariables } from "@anpord/template/extract";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PromptActivityFeed } from "@/components/prompts/prompt-activity-feed";
import { PromptComposer } from "@/components/prompts/prompt-composer";
import { PromptEditorActions } from "@/components/prompts/prompt-editor-actions";
import {
  PromptEditorLayout,
  PromptEditorMain,
} from "@/components/prompts/prompt-editor-layout";
import { PromptEditorSkeleton } from "@/components/prompts/prompt-editor-skeleton";
import { PromptEditorTitle } from "@/components/prompts/prompt-editor-title";
import { PromptRail } from "@/components/prompts/prompt-rail";
import { PromptUnavailable } from "@/components/prompts/prompt-unavailable";
import { useDialog } from "@/lib/dialog/dialogs";
import { activityQueries } from "@/lib/query/activity-queries";
import { channelQueries } from "@/lib/query/channel-queries";
import { promptQueries } from "@/lib/query/prompt-queries";
import { usePointChannel } from "@/lib/use-point-channel";
import { usePromptSelection } from "@/lib/use-prompt-selection";
import { useSaveVersion } from "@/lib/use-save-version";

export const Route = createFileRoute("/_authed/prompts/$id")({
  /** The client fetches these: the API is addressed relatively, which has no
   * base on the server, and the session cookie is the browser's to send. */
  ssr: false,
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.prefetchQuery(promptQueries.versions(params.id)),
      context.queryClient.prefetchQuery(promptQueries.channels(params.id)),
      context.queryClient.prefetchQuery(channelQueries.list()),
      context.queryClient.ensureInfiniteQueryData(
        activityQueries.forPrompt(params.id)
      ),
    ]),
  component: PromptDetailPage,
  staticData: { crumb: (params) => params.id },
});

function PromptDetailPage() {
  const { id } = Route.useParams();
  const versions = useQuery(promptQueries.versions(id));
  const rows = versions.data;
  const latest = rows?.at(0) ?? null;

  if (versions.isPending) {
    return <PromptEditorSkeleton promptId={id} />;
  }
  if (!(rows && latest)) {
    return <PromptUnavailable failed={versions.error !== null} />;
  }

  return <PromptEditor id={id} latest={latest} versions={rows} />;
}

interface PromptEditorProps {
  readonly id: string;
  readonly latest: ResolvedPrompt;
  readonly versions: readonly ResolvedPrompt[];
}

/** Split from the route so these hooks run against a prompt that exists rather
 * than behind the early returns deciding whether one does. */
function PromptEditor({ id, latest, versions }: PromptEditorProps) {
  const { open: openDialog } = useDialog();
  const channels = useQuery(promptQueries.channels(id));
  /** Every channel the organisation defines, so a version can be sent to one
   * that this prompt has never published to. */
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

  /** Writing into a version being read is a choice between two different acts,
   * so it asks which rather than picking one. */
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
