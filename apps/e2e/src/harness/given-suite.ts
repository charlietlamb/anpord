import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { World } from "../world";

const AGENT = `#!/bin/bash
echo '{"_tag":"Started","sessionId":"e2e","model":"'"$ANPORD_MODEL"'"}'
echo done > "$ANPORD_WORKSPACE/done.txt"
printf '{"_tag":"Message","role":"assistant","text":"Wrote done.txt with %s."}\\n' "$ANPORD_MODEL"
echo '{"_tag":"Finished","reason":"done"}'
`;

export interface GivenCase {
  readonly id: string;
  readonly writes: string;
}

export interface GivenSuite {
  readonly file: string;
  readonly id: string;
}

const suiteSource = (
  id: string,
  cases: readonly GivenCase[],
  models: readonly string[]
) => `import { command, suite } from "anpord";

const profile = { dir: "./profile", name: "e2e" };

export default suite({
  id: ${JSON.stringify(id)},
  prompt: "Write done.txt.",
  cases: [
${cases.map((subject) => `    { id: ${JSON.stringify(subject.id)}, validate: command(${JSON.stringify(`test -f ${subject.writes}`)}) },`).join("\n")}
  ],
  variants: [
${models.map((model) => `    { harness: "command", model: ${JSON.stringify(model)}, profile, sandbox: "local" },`).join("\n")}
  ],
  trials: 1,
});
`;

export const givenSuite = (
  world: World,
  id: string,
  cases: readonly GivenCase[],
  models: readonly string[]
): GivenSuite => {
  const directory = join(world.directory, id);
  mkdirSync(join(directory, "profile/home"), { recursive: true });
  writeFileSync(
    join(directory, "profile/profile.json"),
    '{ "run": "bash $ANPORD_HOME/agent.sh" }\n'
  );
  writeFileSync(join(directory, "profile/home/agent.sh"), AGENT);
  writeFileSync(
    join(directory, "suite.eval.ts"),
    suiteSource(id, cases, models)
  );

  return { file: join(id, "suite.eval.ts"), id };
};

const BATCH_ID = /\bbat_[0-9A-Z]+\b/;

export const batchIdIn = (output: string) => {
  const found = output.match(BATCH_ID)?.[0];

  if (found === undefined) {
    throw new Error(`No batch id in:\n${output}`);
  }

  return found;
};
