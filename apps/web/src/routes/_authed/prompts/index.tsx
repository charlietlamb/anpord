import type { PromptSummary } from "@anpord/schema/prompts";
import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { PlusIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listPrompts } from "@/lib/prompts-client";

export const Route = createFileRoute("/_authed/prompts/")({
  component: PromptsPage,
});

/** Fetched on the client: the list is session-scoped and needs the cookie. */
function PromptList({ prompts }: { prompts: readonly PromptSummary[] | null }) {
  if (prompts === null) {
    return <p className="mt-10 text-muted-foreground text-sm">Loading…</p>;
  }

  if (prompts.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-border border-dashed px-6 py-14 text-center">
        <p className="font-heading text-base tracking-tight">No prompts yet</p>
        <p className="mt-1 text-muted-foreground text-sm">
          Create one to start versioning what your application sends.
        </p>
      </div>
    );
  }

  return (
    <ul className="mt-8 divide-y divide-border overflow-hidden rounded-xl border border-border">
      {prompts.map((prompt) => (
        <li key={prompt.id}>
          <Link
            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
            params={{ id: prompt.id }}
            to="/prompts/$id"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-sm">
                {prompt.name}
              </span>
              <span className="block truncate font-mono text-muted-foreground text-xs">
                {prompt.id}
              </span>
            </span>
            <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
              {prompt.productionVersion === null
                ? "draft"
                : `v${prompt.productionVersion} live`}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PromptsPage() {
  const [prompts, setPrompts] = useState<readonly PromptSummary[] | null>(null);

  useEffect(() => {
    let active = true;
    listPrompts()
      .then((rows) => active && setPrompts(rows))
      .catch(() => active && setPrompts([]));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Prompts</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Version and deploy the prompts your application runs on.
          </p>
        </div>
        <Link
          className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
          to="/prompts/new"
        >
          <PlusIcon weight="bold" />
          New prompt
        </Link>
      </div>

      <PromptList prompts={prompts} />
    </div>
  );
}
