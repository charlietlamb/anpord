import { createFileRoute } from "@tanstack/react-router";
import { PreviewComposer } from "@/components/dev/preview-composer";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const Route = createFileRoute("/dev/composer")({
  component: ComposerPreview,
});

const SAMPLE =
  "You are a concise support agent for {{company}}.\n\nAnswer {{customer_name}}'s question using only the context provided. If you are unsure, say so.";

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
        <PreviewComposer initial={SAMPLE} />

        <p className="mt-10 mb-3 font-heading text-muted-foreground text-sm">
          Empty state
        </p>
        <PreviewComposer initial="" />

        <p className="mt-10 mb-3 font-heading text-muted-foreground text-sm">
          On a muted background
        </p>
        <div className="rounded-2xl bg-muted/40 p-6">
          <PreviewComposer initial={SAMPLE} />
        </div>
      </div>
    </main>
  );
}
