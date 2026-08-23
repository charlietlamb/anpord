import { InlineEdit } from "@anpord/ui/components/ui/inline-edit";
import { useAppForm } from "@anpord/ui/hooks/use-app-form";
import { PlusIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { ComposerHeading } from "@/components/prompts/composer-heading";
import { PromptComposerForm } from "@/components/prompts/prompt-composer-form";
import { toId, useCreatePrompt } from "@/lib/prompts/use-create-prompt";

export const Route = createFileRoute("/_authed/prompts/new")({
  component: NewPromptPage,
  staticData: { title: "New prompt" },
});

function NewPromptPage() {
  const create = useCreatePrompt();

  const form = useAppForm({
    defaultValues: { content: "", name: "" },
    onSubmit: async ({ value }) => {
      await create.mutateAsync(value);
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center overflow-y-auto px-6 py-10">
      <ComposerHeading />

      <form.Subscribe selector={(state) => state.values}>
        {(values) => (
          <PromptComposerForm
            content={values.content}
            onContentChange={(content) =>
              form.setFieldValue("content", content)
            }
            onSubmit={form.handleSubmit}
            saving={create.isPending}
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
              onCancel={() => form.setFieldValue("name", "")}
              onChange={(name) => form.setFieldValue("name", name)}
              placeholder="Untitled prompt"
              value={values.name}
            />

            {toId(values.name) === "" ? null : (
              <span className="ml-auto shrink-0 truncate font-mono text-muted-foreground/70 text-xs">
                {toId(values.name)}
              </span>
            )}
          </PromptComposerForm>
        )}
      </form.Subscribe>
    </div>
  );
}
