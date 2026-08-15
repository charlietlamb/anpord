import type { ResolvedPrompt } from "@anpord/schema/prompts";
import { ToolbarButton } from "@anpord/ui/components/toolbar-button";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PromptComposer } from "@/components/prompts/prompt-composer";
import { addVersion, getPrompt } from "@/lib/prompts-client";

export const Route = createFileRoute("/_authed/prompts/$id")({
  component: PromptDetailPage,
});

/** Fetched on the client: the prompt is session-scoped and needs the cookie. */
function PromptDetailPage() {
  const { id } = Route.useParams();
  const [prompt, setPrompt] = useState<ResolvedPrompt | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getPrompt(id)
      .then((next) => {
        if (!active) {
          return;
        }
        setPrompt(next);
        setContent(next.content);
      })
      .catch((error: unknown) => {
        toast.error("Couldn't load the prompt", {
          description: error instanceof Error ? error.message : undefined,
        });
      });
    return () => {
      active = false;
    };
  }, [id]);

  const onSubmit = async () => {
    setSaving(true);
    try {
      const next = await addVersion(id, { content, publish: true });
      setPrompt(next);
      toast.success(`Saved v${next.version}`, {
        description: "Live on production.",
      });
    } catch (error) {
      toast.error("Couldn't save the version", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!prompt) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-6">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  const dirty = content !== prompt.content;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-10">
      <div className="mb-6">
        <h1 className="font-heading text-2xl tracking-tight">{prompt.name}</h1>
        <p className="mt-1 font-mono text-muted-foreground text-xs">
          {prompt.id}
        </p>
      </div>

      <PromptComposer
        content={content}
        onContentChange={setContent}
        onSubmit={onSubmit}
        saving={saving}
        version={prompt.version}
      >
        <ToolbarButton menu>{prompt.name}</ToolbarButton>
      </PromptComposer>

      {dirty ? (
        <p className="mt-3 text-muted-foreground text-xs">
          Unsaved changes — saving creates v{prompt.version + 1}.
        </p>
      ) : null}
    </div>
  );
}
