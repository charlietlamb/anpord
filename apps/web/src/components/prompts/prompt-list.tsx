import type { PromptSummary } from "@anpord/schema/domain/prompts";
import { Link } from "@tanstack/react-router";

export function PromptList({ prompts }: { prompts: readonly PromptSummary[] }) {
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
