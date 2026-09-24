import { InlineEdit } from "@anpord/ui/components/ui/inline-edit";
import { useAppForm } from "@anpord/ui/hooks/use-app-form";
import { PAGE_FRAME, PAGE_WIDTHS } from "@anpord/ui/lib/page-frame";
import { cn } from "@anpord/ui/lib/utils";
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
    <div className={PAGE_FRAME}>
      <div
        className={cn(
          PAGE_WIDTHS.prose,
          "flex flex-1 flex-col justify-center pt-4 pb-8"
        )}
      >
        <ComposerHeading />

        <form.Subscribe selector={(state) => state.values.content}>
          {(content) => (
            <PromptComposerForm
              content={content}
              onContentChange={(next) => form.setFieldValue("content", next)}
              onSubmit={form.handleSubmit}
              saving={create.isPending}
              submitIcon={PlusIcon}
              submitLabel="Create prompt"
            >
              <form.AppField name="name">
                {(field) => (
                  <>
                    <InlineEdit
                      ariaLabel="Prompt name"
                      className="min-w-0 flex-1 font-medium text-base"
                      onBlur={field.handleBlur}
                      onCancel={() => field.handleChange("")}
                      onChange={field.handleChange}
                      placeholder="Untitled prompt"
                      value={field.state.value}
                    />

                    {toId(field.state.value) === "" ? null : (
                      <span className="ml-auto shrink-0 truncate font-mono text-muted-foreground text-xs">
                        {toId(field.state.value)}
                      </span>
                    )}
                  </>
                )}
              </form.AppField>
            </PromptComposerForm>
          )}
        </form.Subscribe>
      </div>
    </div>
  );
}
