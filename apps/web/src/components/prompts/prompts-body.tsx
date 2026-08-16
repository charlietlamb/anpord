import type { PromptSummary } from "@anpord/schema/domain/prompts";
import { PromptList } from "@/components/prompts/prompt-list";

export function PromptsBody({
  error,
  isPending,
  prompts,
}: {
  error: Error | null;
  isPending: boolean;
  prompts: readonly PromptSummary[] | undefined;
}) {
  if (isPending) {
    return <p className="mt-10 text-muted-foreground text-sm">Loading…</p>;
  }

  /** A failed load is not an empty account, so it never renders as "no prompts". */
  if (error || !prompts) {
    return (
      <p className="mt-10 text-muted-foreground text-sm">
        Couldn't load your prompts. {error?.message}
      </p>
    );
  }

  return <PromptList prompts={prompts} />;
}
