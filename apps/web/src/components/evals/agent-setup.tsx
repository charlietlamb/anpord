import { CodeCard } from "@sphynx/ui/components/ui/code-card";
import type { SnippetCommand } from "@sphynx/ui/components/ui/snippet";
import { Snippet } from "@sphynx/ui/components/ui/snippet";
import { useDismissed } from "@sphynx/ui/hooks/use-dismissed";
import { PageSection } from "@/components/layout/page-section";
import { AGENT_PROMPT } from "@/lib/agent-prompt";

const INSTALL: readonly SnippetCommand[] = [
  { command: "bun add sphynx-sh", label: "bun" },
  { command: "npm install sphynx-sh", label: "npm" },
  { command: "pnpm add sphynx-sh", label: "pnpm" },
];

export function AgentSetup() {
  const { dismiss, dismissed } = useDismissed("sphynx.install-dismissed");

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
