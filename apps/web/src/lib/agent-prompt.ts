import { DOCS_ORIGIN, WEB_ORIGIN } from "@sphynx/schema/public/origins";

const KEYS_URL = `${WEB_ORIGIN}/settings/keys`;

export const AGENT_PROMPT = `Write an eval for this repository using Sphynx, in scripts/eval.ts.

Set SPHYNX_API_KEY in the environment. Create one at ${KEYS_URL}.

\`\`\`ts
import { Sphynx, command, repo, suite } from "sphynx-sh";

const smoke = suite({
  id: "<this-repository>",
  prompt: "Read the repository. Make the smallest correct change. {{task}}",
  cases: [
    {
      id: "<short-case-id>",
      variables: { task: "<what the agent must do, one sentence>" },
      source: repo("<owner/repo@commit>"),
      validate: command("<command that exits 0 only when the task is met>"),
    },
  ],
  variants: [
    { harness: "codex", model: "gpt-5.6-sol", sandbox: "daytona" },
    { harness: "claude", model: "opus", sandbox: "daytona" },
    { harness: "gemini", model: "gemini-2.5-pro", sandbox: "daytona" },
  ],
  trials: 3,
});

const sphynx = new Sphynx();
const batch = await sphynx.evals.batches.startAndWait(smoke);

for (const run of batch.runs) {
  console.log(run.case.id, run.variant.harness, run.variant.model, run.distribution.passRate);
}
await sphynx.dispose();
\`\`\`

Rules that decide whether the result means anything:

- \`validate\` decides pass or fail. Without one the trial is recorded but unscored.
- Pin the repository to a commit, or the same eval measures different code each run.
- Three trials or more: one trial measures an outcome, not repeatability.
- Change one field at a time across variants, or a difference has two causes.

Reference:

- ${DOCS_ORIGIN}/guides/run-from-code
- ${DOCS_ORIGIN}/evals/cases
- ${DOCS_ORIGIN}/evals/variants`;
