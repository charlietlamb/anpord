import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { PRODUCTION } from "@anpord/schema/domain/prompts";
import { extractVariables } from "@anpord/ui/lib/prompt-variables";
import { ArrowUpIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PromptComposer } from "@/components/prompts/prompt-composer";
import { PromptEditorHeader } from "@/components/prompts/prompt-editor-header";
import { PromptEditorSkeleton } from "@/components/prompts/prompt-editor-skeleton";
import { PromptRail } from "@/components/prompts/prompt-rail";
import { PromptUnavailable } from "@/components/prompts/prompt-unavailable";
import { useDialog } from "@/lib/dialog/dialogs";
import { promptQueries } from "@/lib/query/prompt-queries";
import { useAddPromptVersion } from "@/lib/query/use-add-prompt-version";
import { useSetPromptChannel } from "@/lib/query/use-set-prompt-channel";

export const Route = createFileRoute("/_authed/prompts/$id")({
  component: PromptDetailPage,
});

/**
 * Editing the working copy and reading a past version are different acts, so a
 * selection names which one rather than overloading a nullable version number.
 */
type Selection =
  | { readonly kind: "draft" }
  | { readonly kind: "history"; readonly version: number };

function PromptDetailPage() {
  const { id } = Route.useParams();

  const { open: openDialog } = useDialog();

  const versions = useQuery(promptQueries.versions(id));
  const channels = useQuery(promptQueries.channels(id));
  const addVersion = useAddPromptVersion(id);

  /** Holding the draft rather than seeding it from the fetch is what keeps a
   * background refetch from overwriting text mid-sentence. */
  const [draft, setDraft] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({ kind: "draft" });

  const promote = useSetPromptChannel(id);

  const rows = versions.data;
  const latest = rows?.at(0) ?? null;

  if (versions.isPending) {
    return <PromptEditorSkeleton />;
  }
  if (!(rows && latest)) {
    return <PromptUnavailable failed={versions.error !== null} />;
  }

  const editing = selection.kind === "draft";
  const viewed = editing
    ? latest
    : (rows.find((row) => row.version === selection.version) ?? latest);

  const content = editing ? (draft ?? latest.content) : viewed.content;
  /** Trailing whitespace is an artefact of typing, not an edit worth a version. */
  const submitted = content.trim();
  const dirty = editing && submitted !== latest.content.trim();

  const onSave = () =>
    addVersion.mutate(
      { content: submitted },
      {
        onError: (error) =>
          toast.error("Couldn't save the version", {
            description: error instanceof Error ? error.message : undefined,
          }),
        onSuccess: (created) => {
          setDraft(null);
          setSelection({ kind: "draft" });
          toast.success(`Saved v${created.version}`, {
            description: "Point a channel at it to publish.",
          });
        },
      }
    );

  const editFrom = (from: ResolvedPrompt) => {
    setDraft(from.content);
    setSelection({ kind: "draft" });
    toast.success(`Editing from v${from.version}`, {
      description: "Save to add it as a new version.",
    });
  };

  const pointChannel = (channel: string, version: number) =>
    promote.mutate(
      { channel, version },
      {
        onError: (error) =>
          toast.error("Couldn't move the channel", {
            description: error instanceof Error ? error.message : undefined,
          }),
        onSuccess: () => toast.success(`${channel} now serves v${version}`),
      }
    );

  /** Production is what callers receive, so moving it asks first. */
  const onPoint = (channel: string, version: number) => {
    if (channel !== PRODUCTION) {
      pointChannel(channel, version);
      return;
    }
    openDialog("confirm", {
      confirmLabel: `Point at v${version}`,
      description: `Callers asking for production will receive v${version}.`,
      onConfirm: () => pointChannel(channel, version),
      title: `Point production at v${version}?`,
    });
  };

  const onAddChannel = () =>
    openDialog("newChannel", {
      onSubmit: (channel: string) => pointChannel(channel, viewed.version),
      version: viewed.version,
    });

  /**
   * History is read-only, so typing in it asks first: the edit becomes a new
   * version rather than a change to the one being read.
   */
  const onEditRequest = () => {
    if (editing) {
      return;
    }
    openDialog("confirm", {
      confirmLabel: `Edit from v${viewed.version}`,
      description: `Saving adds a new version with these changes. v${viewed.version} stays as it is.`,
      onConfirm: () => editFrom(viewed),
      title: `Edit from v${viewed.version}?`,
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:absolute lg:inset-0 lg:top-14">
      <PromptEditorHeader
        dirty={dirty}
        name={latest.name}
        onSave={onSave}
        promptId={latest.id}
        saving={addVersion.isPending}
        viewingVersion={editing ? null : viewed.version}
      />

      <div className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 gap-6 overflow-y-auto py-6 pr-6 pl-6 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_20rem] lg:overflow-hidden lg:pr-0 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-8 xl:pl-8">
        <main className="flex min-h-0 min-w-0 flex-col">
          <PromptComposer
            content={content}
            fill
            onContentChange={setDraft}
            onEditRequest={onEditRequest}
            onSubmit={onSave}
            readOnly={!editing}
            saving={addVersion.isPending}
            submitIcon={ArrowUpIcon}
            submitLabel="Save version"
          />
        </main>

        <PromptRail
          channels={channels.data ?? []}
          editing={editing}
          onAddChannel={onAddChannel}
          onEditFrom={() => editFrom(viewed)}
          onPoint={onPoint}
          onSelect={(version: ResolvedPrompt) =>
            setSelection({ kind: "history", version: version.version })
          }
          pointing={promote.isPending}
          variables={extractVariables(content)}
          versions={rows}
          viewed={viewed}
        />
      </div>
    </div>
  );
}
