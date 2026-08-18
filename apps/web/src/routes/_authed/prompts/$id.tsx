import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { PRODUCTION } from "@anpord/schema/domain/prompts";
import { extractVariables } from "@anpord/template/extract";
import { ArrowUpIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PromptComposer } from "@/components/prompts/prompt-composer";
import { PromptEditorHeader } from "@/components/prompts/prompt-editor-header";
import { PromptEditorLayout } from "@/components/prompts/prompt-editor-layout";
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
  /** The client fetches these: the API is addressed relatively, which has no
   * base on the server, and the session cookie is the browser's to send. */
  ssr: false,
  loader: async ({ context, params }) => {
    const { promptQueries: queries } = await import(
      "@/lib/query/prompt-queries"
    );
    return Promise.all([
      context.queryClient.ensureQueryData(queries.versions(params.id)),
      context.queryClient.ensureQueryData(queries.channels(params.id)),
    ]);
  },
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

  const base = correcting ? viewed : latest;
  const content = editing ? (draft ?? base.content) : viewed.content;
  const submitted = content.trim();
  const dirty = editing && submitted !== base.content.trim();

  const servedChannels = (version: number): readonly string[] =>
    (channels.data ?? []).reduce<string[]>((names, placement) => {
      if (placement.version === version) {
        names.push(placement.channel);
      }
      return names;
    }, []);

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

  /** Where a channel sits now, which both the confirmation and the undo need
   * and neither should recompute. */
  const versionOn = (channel: string): number | null =>
    (channels.data ?? []).find((placement) => placement.channel === channel)
      ?.version ?? null;

  const pointChannel = (channel: string, version: number) => {
    const servedBefore = versionOn(channel);

    return promote.mutate(
      { channel, version },
      {
        onError: (error) =>
          toast.error("Couldn't move the channel", {
            description: error instanceof Error ? error.message : undefined,
          }),
        onSuccess: () =>
          toast.success(`${channel} now serves v${version}`, {
            action:
              servedBefore === null
                ? undefined
                : {
                    label: `Undo to v${servedBefore}`,
                    onClick: () => pointChannel(channel, servedBefore),
                  },
          }),
      }
    );
  };

  /** Naming both ends is what makes this a decision rather than a restatement:
   * a caller cannot tell a routine step forward from a rollback nine versions
   * back without being told where the channel is now. */
  const onPoint = (channel: string, version: number) => {
    const current = versionOn(channel);

    if (channel !== PRODUCTION) {
      pointChannel(channel, version);
      return;
    }

    openDialog("confirm", {
      confirmLabel: `Promote v${version}`,
      description:
        current === null
          ? `Every caller asking for production will receive v${version}, immediately. You can point it elsewhere at any time. Versions are never overwritten.`
          : `Production serves v${current}. Every caller will receive v${version} instead, immediately. You can point it back to v${current} at any time. Versions are never overwritten.`,
      onConfirm: () => pointChannel(channel, version),
      title:
        current !== null && version < current
          ? `Roll production back to v${version}?`
          : `Promote v${version} to production?`,
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
    <PromptEditorLayout
      header={
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
      }
    >
      <main className="relative flex min-h-[20rem] min-w-0 flex-col">
        <PromptComposer
          content={content}
          filename={`${id}.md`}
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
    </PromptEditorLayout>
  );
}
