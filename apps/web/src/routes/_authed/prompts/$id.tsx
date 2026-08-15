import type { ResolvedPrompt } from "@anpord/schema/prompts";
import { ToolbarButton } from "@anpord/ui/components/toolbar-button";
import { ArrowUpIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
  const [versions, setVersions] = useState<ResolvedPrompt[] | null>(null);
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-10">
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
        <ToolbarButton menu>{latest.name}</ToolbarButton>
      </PromptComposer>

      {readOnly ? (
        <div className="mt-3 flex items-center gap-3 text-muted-foreground text-xs">
          <span>Viewing v{viewed?.version} — read only.</span>
          <button
            className="font-medium text-foreground underline-offset-2 hover:underline"
            onClick={() => setViewing(null)}
            type="button"
          >
            Back to latest
          </button>
        </div>
      ) : null}

      {!readOnly && content !== latest.content ? (
        <p className="mt-3 text-muted-foreground text-xs">
          Unsaved changes — saving creates v{latest.version + 1}.
        </p>
      ) : null}

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
