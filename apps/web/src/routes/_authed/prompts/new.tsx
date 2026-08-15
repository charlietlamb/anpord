import { Input } from "@anpord/ui/components/input";
import { PlusIcon, TextTIcon } from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PromptComposer } from "@/components/prompts/prompt-composer";
import { createPrompt } from "@/lib/prompts-client";

export const Route = createFileRoute("/_authed/prompts/new")({
  component: NewPromptPage,
  staticData: { title: "New prompt" },
});

/** Lowercase slug so the handle is URL-safe without the author thinking about it. */
const toId = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function NewPromptPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const id = toId(name);

  const onSubmit = async () => {
    if (!id) {
      toast.error("Give the prompt a name first");
      return;
    }

    setSaving(true);
    try {
      await createPrompt({ content, id, name } as never);
      toast.success("Prompt created", { description: "Live on production." });
      navigate({ params: { id }, to: "/prompts/$id" });
    } catch (error) {
      toast.error("Couldn't create the prompt", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-10">
      <PromptComposer
        content={content}
        onContentChange={setContent}
        onSubmit={onSubmit}
        saving={saving}
        submitIcon={PlusIcon}
        submitLabel="Create prompt"
      >
        <TextTIcon className="ml-1 size-4 shrink-0 text-muted-foreground" />
        <Input
          aria-label="Prompt name"
          className="h-7 w-56 border-0 bg-transparent px-1.5 font-medium text-sm shadow-none focus-visible:ring-0"
          onChange={(event) => setName(event.target.value)}
          placeholder="Untitled prompt"
          value={name}
        />
        {id ? (
          <span className="font-mono text-muted-foreground/70 text-xs">
            {id}
          </span>
        ) : null}
      </PromptComposer>
    </div>
  );
}
