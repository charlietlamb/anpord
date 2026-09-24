import { CodeCard } from "@anpord/ui/components/ui/code-card";
import type { SnippetCommand } from "@anpord/ui/components/ui/snippet";
import { Snippet } from "@anpord/ui/components/ui/snippet";
import { useDismissed } from "@anpord/ui/hooks/use-dismissed";
import { PageSection } from "@/components/layout/page-section";
import { AGENT_PROMPT } from "@/lib/agent-prompt";

const INSTALL: readonly SnippetCommand[] = [
  { command: "bun add anpord", label: "bun" },
  { command: "npm install anpord", label: "npm" },
  { command: "pnpm add anpord", label: "pnpm" },
];

export function AgentSetup() {
  const { dismiss, dismissed } = useDismissed("anpord.install-dismissed");

  return (
    <div className="flex flex-col gap-10">
      {dismissed ? null : (
        <PageSection title="Install the SDK">
          <Snippet commands={INSTALL} onDismiss={dismiss} />
        </PageSection>
      )}

      <PageSection title="Hand this to your coding agent">
        <CodeCard code={AGENT_PROMPT} label="PROMPT.md" lang="markdown" />
      </PageSection>
    </div>
  );
}
