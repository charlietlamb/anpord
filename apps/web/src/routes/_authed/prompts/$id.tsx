import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { ArrowUpIcon, TextTIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ComposerHeading } from "@/components/prompts/composer-heading";
import { PromptComposer } from "@/components/prompts/prompt-composer";
import { VersionHistory } from "@/components/prompts/version-history";
import { addVersion, listVersions } from "@/lib/prompts-client";

export const Route = createFileRoute("/_authed/prompts/$id")({
  component: PromptDetailPage,
});

/**
 * The newest version is the working copy; older ones open read-only so an edit
 * can never overwrite history. Restoring copies content forward as a draft.
 */
function PromptDetailPage() {
  const { id } = Route.useParams();
  const [versions, setVersions] = useState<readonly ResolvedPrompt[] | null>(
    null
  );
  const [viewing, setViewing] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const rows = await listVersions(id);
    setVersions(rows);
    setViewing(null);
    setContent(rows.at(0)?.content ?? "");
  }, [id]);

  useEffect(() => {
    load().catch((error: unknown) => {
      toast.error("Couldn't load the prompt", {
        description: error instanceof Error ? error.message : undefined,
      });
      setVersions([]);
    });
  }, [load]);

  const latest = versions?.at(0) ?? null;
  const viewed =
    viewing === null
      ? latest
      : (versions?.find((row) => row.version === viewing) ?? latest);
  const readOnly = viewing !== null;

  const onSubmit = async () => {
    setSaving(true);
    try {
      const next = await addVersion(id, { content, publish: true });
      toast.success(`Saved v${next.version}`, {
        description: "Live on production.",
      });
      await load();
    } catch (error) {
      toast.error("Couldn't save the version", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const onRestore = (version: ResolvedPrompt) => {
    setViewing(null);
    setContent(version.content);
    toast.success(`Restored v${version.version}`, {
      description: "Save to publish it as a new version.",
    });
  };

  if (!(versions && latest)) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-6">
        <p className="text-muted-foreground text-sm">
          {versions === null ? "Loading…" : "Prompt not found."}
        </p>
      </div>
    );
  }

  const dirty = !readOnly && content !== latest.content;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-10">
      <ComposerHeading promptName={latest.name} />

      <PromptComposer
        content={readOnly ? (viewed?.content ?? "") : content}
        onContentChange={setContent}
        onSubmit={onSubmit}
        readOnly={readOnly}
        saving={saving}
        submitIcon={ArrowUpIcon}
        submitLabel="Save version"
        version={viewed?.version}
      >
        <span className="flex min-w-0 items-center gap-1.5 px-1.5">
          <TextTIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium text-sm">{latest.name}</span>
          <span className="truncate font-mono text-muted-foreground/70 text-xs">
            {latest.id}
          </span>
        </span>

        {/* Saved is the resting state, so only the exceptions get a mark. */}
        {dirty ? (
          <span className="ml-auto flex shrink-0 items-center">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-amber-500"
            />
            <span className="sr-only">Unsaved changes</span>
          </span>
        ) : null}
        {readOnly ? (
          <span className="ml-auto shrink-0 pr-1 text-muted-foreground text-xs">
            Read only
          </span>
        ) : null}
      </PromptComposer>

      <VersionHistory
        liveVersion={latest.version}
        onRestore={onRestore}
        onSelect={(version) =>
          setViewing(
            version.version === latest.version ? null : version.version
          )
        }
        selectedVersion={viewed?.version ?? null}
        versions={versions}
      />
    </div>
  );
}
