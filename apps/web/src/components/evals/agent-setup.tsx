import { CodeCard } from "@anpord/ui/components/ui/code-card";
import type { SnippetCommand } from "@anpord/ui/components/ui/snippet";
import { Snippet } from "@anpord/ui/components/ui/snippet";
import { useDismissed } from "@anpord/ui/hooks/use-dismissed";
import { DOCS_URL } from "@/lib/urls";

const INSTALL: readonly SnippetCommand[] = [
  { command: "bun add anpord", label: "bun" },
  { command: "npm install anpord", label: "npm" },
  { command: "pnpm add anpord", label: "pnpm" },
];

const KEYS_URL = "https://www.anpord.com/settings/keys";

/* One block, because it is one instruction. Split in two, an agent has to
   work out which half is the brief and which is the file; together it reads
   top to bottom the way it will be acted on.
   
   The model is written in rather than read from the environment: one variable
   to set is a step, two is a checklist, and the id is the thing most likely
   to be changed by hand anyway. */
const PROMPT = `Write an eval for this repository using Anpord, in scripts/eval.ts.

Set ANPORD_API_KEY in the environment. Create one at ${KEYS_URL}.

\`\`\`ts
import { Anpord } from "anpord";

const anpord = new Anpord();

const run = await anpord.evals.startAndWait({
  cases: [
    {
      name: "<short name for the task>",
      variables: { task: "<what the agent must do, one sentence>" },
      source: {
        kind: "repo",
        url: "<this repository's clone url>",
        ref: "<a commit>",
      },
      setup: "<command that installs dependencies>",
      verify: "<command that exits 0 only when the task is met>",
    },
  ],
  prompt: "Read the repository. Make the smallest correct change. {{task}}",
  tasks: [
    { harness: "codex", model: "gpt-5.6-sol", provider: "daytona" },
    { harness: "claude", model: "opus", provider: "daytona" },
    { harness: "gemini", model: "gemini-2.5-pro", provider: "daytona" },
  ],
  trials: 3,
});

for (const cell of run.cells) {
  console.log(cell.harness, cell.model, cell.distribution?.passRate);
}
await anpord.dispose();
\`\`\`

Rules that decide whether the result means anything:

- \`verify\` decides pass or fail. Without one the trial is recorded but unscored.
- Pin \`ref\` to a commit, or the same eval measures different code each run.
- Three trials or more: one trial measures an outcome, not repeatability.
- Change one field at a time across tasks, or a difference has two causes.

Reference:

- ${DOCS_URL}/guides/run-from-code
- ${DOCS_URL}/evals/cases
- ${DOCS_URL}/evals/harnesses`;

/**
 * Writing an eval somewhere other than this page.
 *
 * The form beside it is the faster path for one case typed by hand; this is
 * the one that lasts, because an eval kept in the repository is reviewed,
 * versioned and run in CI like anything else.
 */
export function AgentSetup() {
  const { dismiss, dismissed } = useDismissed("anpord.install-dismissed");

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h2 className="font-heading text-base tracking-tight">
          Write an eval in code
        </h2>
        <p className="max-w-prose text-muted-foreground text-xs">
          Install the SDK, then hand the prompt to your coding agent. It carries
          the API, the rules that decide whether a result means anything, and
          where the rest is documented.
        </p>
      </header>

      {dismissed ? null : <Snippet commands={INSTALL} onDismiss={dismiss} />}

      <CodeCard code={PROMPT} label="PROMPT.md" lang="markdown" />
    </div>
  );
}
