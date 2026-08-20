import { InlineEdit } from "@anpord/ui/components/ui/inline-edit";
import { PlusIcon } from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ComposerHeading } from "@/components/prompts/composer-heading";
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
      await createPrompt({ content: content.trim(), id, name } as never);
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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center overflow-y-auto px-6 py-10">
      <ComposerHeading />

      <PromptComposer
        bounded
        content={content}
        onContentChange={setContent}
        onSubmit={onSubmit}
        saving={saving}
        submitIcon={PlusIcon}
        submitLabel="Create prompt"
      >
        {/* The name is written where it will be read, the same way it is
            renamed later, rather than in a field that outweighs the prompt
            below it. */}
        <InlineEdit
          ariaLabel="Prompt name"
          className="min-w-0 flex-1 font-medium text-base"
          onBlur={() => undefined}
          onCancel={() => setName("")}
          onChange={setName}
          placeholder="Untitled prompt"
          value={name}
        />
        {id ? (
          <span className="ml-auto shrink-0 truncate font-mono text-muted-foreground/70 text-xs">
            {id}
          </span>
        ) : null}
      </PromptComposer>
    </div>
  );
}
