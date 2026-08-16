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
import { useUpdatePrompt } from "@/lib/query/use-update-prompt";
import { useUpdatePromptVersion } from "@/lib/query/use-update-prompt-version";

export const Route = createFileRoute("/_authed/prompts/$id")({
  component: PromptDetailPage,
  staticData: { crumb: (params) => params.id },
});

/**
 * Editing the working copy, reading a past version, and correcting one in place
 * are three different acts, so a selection names which one rather than
 * overloading a nullable version number.
 */
type Selection =
  | { readonly kind: "draft" }
  | { readonly kind: "history"; readonly version: number }
  | { readonly kind: "correcting"; readonly version: number };

/** Naming the channels is what tells an author whether a correction is a
 * private tidy-up or an immediate change to what callers receive. */
const listChannels = (names: readonly string[]): string =>
  names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

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
  const updateDetails = useUpdatePrompt(id);
  const correctVersion = useUpdatePromptVersion(id);

  const rows = versions.data;
  const latest = rows?.at(0) ?? null;

  if (versions.isPending) {
    return <PromptEditorSkeleton promptId={id} />;
  }
  if (!(rows && latest)) {
    return <PromptUnavailable failed={versions.error !== null} />;
  }

  const correcting = selection.kind === "correcting";
  const editing = selection.kind === "draft" || correcting;
  const viewed =
    selection.kind === "draft"
      ? latest
      : (rows.find((row) => row.version === selection.version) ?? latest);

  /** A correction edits the version being read, so its baseline is that
   * version rather than the latest one. */
  const base = correcting ? viewed : latest;
  const content = editing ? (draft ?? base.content) : viewed.content;
  /** Trailing whitespace is an artefact of typing, not an edit worth a version. */
  const submitted = content.trim();
  const dirty = editing && submitted !== base.content.trim();

  const servedChannels = (version: number): readonly string[] =>
    (channels.data ?? [])
      .filter((placement) => placement.version === version)
      .map((placement) => placement.channel);

  const appendVersion = () =>
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

  const overwriteVersion = (version: number) =>
    correctVersion.mutate(
      { content: submitted, version },
      {
        onError: (error) =>
          toast.error(`Couldn't overwrite v${version}`, {
            description: error instanceof Error ? error.message : undefined,
          }),
        onSuccess: () => {
          setDraft(null);
          setSelection({ kind: "history", version });
          toast.success(`Overwrote v${version}`);
        },
      }
    );

  /** Overwriting rewrites history and can change what a channel already
   * serves, so it asks before replacing the version. */
  const onSave = () => {
    if (selection.kind !== "correcting") {
      appendVersion();
      return;
    }
    const { version } = selection;
    openDialog("confirm", {
      confirmLabel: `Overwrite v${version}`,
      description: servedChannels(version).length
        ? `v${version} is served by ${listChannels(servedChannels(version))}, so callers will receive these changes immediately. The original content cannot be recovered.`
        : `The original content of v${version} cannot be recovered.`,
      onConfirm: () => overwriteVersion(version),
      title: `Overwrite v${version}?`,
      destructive: true,
    });
  };

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

  const onEditDetails = () =>
    openDialog("editPrompt", {
      id: latest.id,
      name: latest.name,
      onSubmit: (details) =>
        updateDetails.mutate(details, {
          onError: (error) =>
            toast.error("Couldn't save the details", {
              description: error instanceof Error ? error.message : undefined,
            }),
          onSuccess: () => toast.success("Details saved"),
        }),
    });

  const onAddChannel = () =>
    openDialog("newChannel", {
      onSubmit: (channel: string) => pointChannel(channel, viewed.version),
      version: viewed.version,
    });

  /**
   * History is read-only, so typing in it asks first. Branching is the safe
   * default; correcting the version in place is offered for the case it exists
   * to serve, a version saved with a mistake in it.
   */
  const onEditRequest = () => {
    if (editing) {
      return;
    }
    openDialog("editVersion", {
      onCorrect: () =>
        setSelection({ kind: "correcting", version: viewed.version }),
      onEditFrom: () => editFrom(viewed),
      servedBy: servedChannels(viewed.version),
      version: viewed.version,
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col pt-6 lg:absolute lg:inset-0 lg:top-14">
      <div className="px-6 lg:pr-[2.125rem] xl:px-8 xl:pr-[2.625rem]">
        <PromptEditorHeader
          correctingVersion={correcting ? viewed.version : null}
          dirty={dirty}
          name={latest.name}
          onCancelCorrection={() => {
            setDraft(null);
            setSelection({ kind: "history", version: viewed.version });
          }}
          onEditDetails={onEditDetails}
          onSave={onSave}
          promptId={latest.id}
          saving={addVersion.isPending || correctVersion.isPending}
          viewingVersion={editing ? null : viewed.version}
        />
      </div>

      <div className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 gap-6 overflow-y-auto px-6 py-6 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_20rem] lg:overflow-hidden lg:pr-0 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-8 xl:px-8 xl:pr-0">
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
          channelsPending={channels.isPending}
          editing={editing}
          onAddChannel={onAddChannel}
          onEditFrom={() => editFrom(viewed)}
          onPoint={onPoint}
          onPromote={() => onPoint(PRODUCTION, viewed.version)}
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
