import { CodeBlock } from "@anpord/ui/components/ui/code-block";
import type { SnippetCommand } from "@anpord/ui/components/ui/snippet";
import { Snippet } from "@anpord/ui/components/ui/snippet";
import { DOCS_URL } from "@/lib/urls";

const INSTALL: readonly SnippetCommand[] = [
  { command: "bun add anpord", label: "bun" },
  { command: "npm install anpord", label: "npm" },
  { command: "pnpm add anpord", label: "pnpm" },
];

/* Written to be pasted into a coding agent rather than read: it names the
   package, the two environment variables, the shape of a case and where the
   rest is documented, so the agent can write the file without guessing and
   without another round trip. */
const PROMPT = `Write an eval for this repository using Anpord.

Install the SDK: \`bun add anpord\` (or npm/pnpm).

It needs two environment variables:
  ANPORD_API_KEY  — create one at ${new URL("/settings/keys", "https://www.anpord.com").href}
  EVAL_MODEL      — a model id the harness understands, e.g. gpt-5.6-sol

Write \`scripts/eval.ts\`:

  import { Anpord } from "anpord";

  const anpord = new Anpord();

  const { id } = await anpord.evals.start({
    cases: [
      {
        name: "<short name for the task>",
        goal: "<what the agent must do, one sentence>",
        source: { kind: "repo", url: "<this repository's clone url>", ref: "<a commit>" },
        setup: "<command that installs dependencies>",
        verify: "<command that exits 0 only when the goal is met>",
      },
    ],
    prompt: "Read the repository. Make the smallest correct change. {{goal}}",
    tasks: [{ harness: "codex", model: process.env.EVAL_MODEL!, provider: "daytona" }],
    trials: 3,
  });

  let run = await anpord.evals.get({ id });
  while (run.status === "running") {
    await new Promise((r) => setTimeout(r, 2000));
    run = await anpord.evals.get({ id });
  }

  console.log(run.cells[0]?.distribution);
  await anpord.dispose();

Rules that matter:
  - \`verify\` decides pass or fail. Without one the trial is recorded but unscored.
  - Pin \`ref\` to a commit, or the same eval measures different code each run.
  - Three trials or more: one trial measures an outcome, not repeatability.
  - A cell is one case on one task. Keep the grid small to start.

Full reference: ${DOCS_URL}/guides/run-from-code
Cases and verifiers: ${DOCS_URL}/evals/cases
Harnesses and models: ${DOCS_URL}/evals/harnesses`;

/**
 * Everything needed to write an eval somewhere other than this page.
 *
 * The form beside it is the faster path for one case typed by hand; this is
 * the one that scales, because an eval that lives in the repository is
 * reviewed, versioned and run in CI like anything else. The prompt is the
 * useful half: a coding agent given it can write the file without being told
 * the API twice.
 */
export function AgentSetup() {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="font-medium text-sm">Install the SDK</h2>
          <p className="text-muted-foreground text-xs">
            Adds the client, and the <code className="font-mono">anpord</code>{" "}
            CLI for reading results back.
          </p>
        </div>

        <Snippet commands={INSTALL} />
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="font-medium text-sm">Hand this to your agent</h2>
          <p className="text-muted-foreground text-xs">
            Paste it into Claude Code, Codex or Cursor. It carries the API, the
            rules that decide whether a result means anything, and where the
            rest is documented.
          </p>
        </div>

        <CodeBlock className="max-h-80" copyValue={PROMPT}>
          {PROMPT}
        </CodeBlock>
      </section>
    </div>
  );
}
