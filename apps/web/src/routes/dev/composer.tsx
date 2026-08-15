import { ToolbarButton } from "@anpord/ui/components/toolbar-button";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PromptComposer } from "@/components/prompts/prompt-composer";

export const Route = createFileRoute("/dev/composer")({
  component: ComposerPreview,
});

const SAMPLE =
  "You are a concise support agent for {{company}}.\n\nAnswer {{customer_name}}'s question using only the context provided. If you are unsure, say so.";

function Preview({ initial, version }: { initial: string; version?: number }) {
  const [content, setContent] = useState(initial);

  return (
    <PromptComposer
      content={content}
      onContentChange={setContent}
      onSubmit={() => undefined}
      saving={false}
      version={version}
    >
      <ToolbarButton menu>checkout-greeting</ToolbarButton>
    </PromptComposer>
  );
}

function ComposerPreview() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl tracking-tight">Composer</h1>
            <p className="text-muted-foreground text-sm">
              The real editor. Toggle the theme to check both.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <p className="mb-3 font-heading text-muted-foreground text-sm">
          With variables and a version
        </p>
        <Preview initial={SAMPLE} version={3} />

        <p className="mt-10 mb-3 font-heading text-muted-foreground text-sm">
          Empty state
        </p>
        <Preview initial="" />

        <p className="mt-10 mb-3 font-heading text-muted-foreground text-sm">
          On a muted background
        </p>
        <div className="rounded-2xl bg-muted/40 p-6">
          <Preview initial={SAMPLE} version={3} />
        </div>
      </div>
    </main>
  );
}
