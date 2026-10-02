import { PlusIcon, TextTIcon } from "@phosphor-icons/react";
import { ToolbarButton } from "@sphynx/ui/components/toolbar-button";
import { useState } from "react";
import { PromptComposerForm } from "@/components/prompts/prompt-composer-form";

export function PreviewComposer({ initial }: { initial: string }) {
  const [content, setContent] = useState(initial);

  return (
    <PromptComposerForm
      content={content}
      onContentChange={setContent}
      onSubmit={() => undefined}
      saving={false}
      submitIcon={PlusIcon}
      submitLabel="Create prompt"
    >
      <ToolbarButton menu>
        <TextTIcon />
        checkout-greeting
      </ToolbarButton>
    </PromptComposerForm>
  );
}
