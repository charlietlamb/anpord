import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkVoid } from "@anpord/sandbox-watch/void";
import { type Box, openDaytona, openE2B, type Ran } from "./providers";

const SCRATCH =
  "/tmp/claude-501/-Users-charlielamb-Documents-anpord/12b411dd-d640-4169-a77f-0b9be144cdbd/scratchpad";
process.env.E2B_API_KEY ??= readFileSync(`${SCRATCH}/e2b.key`, "utf8").trim();
process.env.DAYTONA_API_KEY ??= readFileSync(
  `${SCRATCH}/daytona.key`,
  "utf8"
).trim();

const OUT = resolve(import.meta.dir, "../.sessions");
const WORKSPACE = "/tmp/anpord-task";
const say = (message: string) => process.stdout.write(`${message}\n`);

/** A task the agent is meant to fix, and the test that decides whether it did.
 * The bug is deliberate: a run that passes before the agent touches it means
 * the verifier is broken, which is the first thing worth finding out. */
const TASK = {
  broken: "def total(items):\n    return sum(items) - 1\n",
  fixed: "def total(items):\n    return sum(items)\n",
  test: "from calc import total\n\n\ndef test_total():\n    assert total([1, 2, 3]) == 6\n",
};

interface Trial {
  readonly afterFix: number;
  readonly baseline: number;
  readonly journal: Ran[];
  readonly provider: string;
  readonly sandboxId: string;
  readonly voided: boolean;
  readonly voidFields: readonly string[];
}

/**
 * One trial: stand the task up, prove it fails, apply the known fix, prove it
 * passes. An agent goes where the fix is applied; running it with the answer
 * brackets the scorer, because a verifier that cannot tell these two states
 * apart cannot score anything.
 */
const trial = async (open: (workspace: string) => Promise<Box>) => {
  const box = await open(WORKSPACE);
  const journal: Ran[] = [];
  const step = async (command: string, timeoutMs?: number) => {
    const ran = await box.run(command, timeoutMs);
    journal.push(ran);
    return ran;
  };

  try {
    await step("python3 -m pip install --quiet pytest 2>&1 | tail -1", 180_000);
    await box.write(`${WORKSPACE}/calc.py`, TASK.broken);
    await box.write(`${WORKSPACE}/test_calc.py`, TASK.test);

    /* Unpiped, because a pipeline exits with its last command and would report
       the success of tail rather than the failure of pytest. */
    const baseline = await step("python3 -m pytest -q");

    await box.write(`${WORKSPACE}/calc.py`, TASK.fixed);
    const afterFix = await step("python3 -m pytest -q");

    const fingerprint = {
      baselineOutput: baseline.stdout,
      files: (await step("ls -1 | sort | tr '\\n' ','")).stdout,
      fixedOutput: afterFix.stdout,
      python: (await step("python3 --version")).stdout,
    };

    const check = checkVoid(fingerprint);

    return {
      afterFix: afterFix.exitCode,
      baseline: baseline.exitCode,
      journal,
      provider: box.provider,
      sandboxId: box.id,
      voidFields: check.fields,
      voided: check.voided,
    } satisfies Trial;
  } finally {
    await box.stop();
  }
};

const main = async () => {
  const results: Trial[] = [];

  for (const [name, open] of [
    ["e2b", openE2B],
    ["daytona", openDaytona],
  ] as const) {
    say(`\n=== ${name} ===`);
    const started = Date.now();
    const found = await trial(open);
    results.push(found);

    say(`  sandbox ${found.sandboxId} in ${Date.now() - started}ms`);
    for (const ran of found.journal) {
      say(
        `  [${String(ran.exitCode).padStart(3)}] ${String(ran.durationMs).padStart(6)}ms ${ran.command.slice(0, 44)}`
      );
    }
    say(`  baseline exit ${found.baseline} (must be non-zero)`);
    say(`  after fix exit ${found.afterFix} (must be zero)`);
    say(`  void: ${found.voided ? found.voidFields.join(",") : "no"}`);

    const sound = !found.voided && found.baseline !== 0 && found.afterFix === 0;
    say(`  verifier is ${sound ? "sound" : "NOT SOUND"}`);
  }

  writeFileSync(
    resolve(OUT, `eval-${Date.now()}.json`),
    `${JSON.stringify(results, null, 2)}\n`
  );

  say("\n=== agreement across providers ===");
  const [first, second] = results;
  if (first && second) {
    say(`  baseline: ${first.baseline} vs ${second.baseline}`);
    say(`  after fix: ${first.afterFix} vs ${second.afterFix}`);
    const agree =
      first.baseline === second.baseline && first.afterFix === second.afterFix;
    say(`  ${agree ? "providers agree" : "PROVIDERS DISAGREE"}`);
  }
};

await main();
