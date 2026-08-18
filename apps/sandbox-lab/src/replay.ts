import { readFileSync } from "node:fs";
import { Sandbox } from "e2b";

const KEY_PATH =
  process.env.E2B_KEY_FILE ??
  "/tmp/claude-501/-Users-charlielamb-Documents-anpord/12b411dd-d640-4169-a77f-0b9be144cdbd/scratchpad/e2b.key";

process.env.E2B_API_KEY ??= readFileSync(KEY_PATH, "utf8").trim();

const say = (message: string) => process.stdout.write(`${message}\n`);

/**
 * Whether a snapshot is a record or only a resumption point. A run that can be
 * booted weeks later and still answer what the agent wrote, what the tests
 * said, and how the code got there is an artefact; one that only restores a
 * working directory is not.
 */
const main = async () => {
  const snapshotId = process.argv[2];
  if (!snapshotId) {
    say("usage: replay <snapshotId>");
    process.exit(1);
  }

  say("listing snapshots");
  const snapshots = await Sandbox.listSnapshots().nextItems();
  say(`  ${snapshots.length} found`);
  for (const found of snapshots.slice(0, 5)) {
    say(`  ${found.snapshotId}`);
  }

  say(`\nbooting from ${snapshotId}`);
  const started = Date.now();
  const sandbox = await Sandbox.create(snapshotId, { timeoutMs: 300_000 });
  say(`  ${sandbox.sandboxId} in ${Date.now() - started}ms`);

  const ask = async (label: string, command: string) => {
    const result = await sandbox.commands
      .run(command)
      .catch((cause: { stdout?: string; stderr?: string }) => ({
        exitCode: 1,
        stderr: cause.stderr ?? "",
        stdout: cause.stdout ?? "",
      }));
    say(`\n${label}`);
    say(
      (result.stdout || result.stderr)
        .trim()
        .split("\n")
        .slice(0, 8)
        .map((line) => `  ${line}`)
        .join("\n")
    );
  };

  await ask("what did the agent leave behind?", "ls -la /home/user/workspace");
  await ask("what does the code say now?", "cat /home/user/workspace/calc.py");
  await ask(
    "how did it get there?",
    "cd /home/user/workspace && git log --format='%h %s' --shortstat | head -12"
  );
  await ask(
    "do the tests pass in the restored state?",
    "cd /home/user/workspace && python3 -m pytest test_calc.py -q 2>&1 | tail -3"
  );
  await ask(
    "what did the trap record?",
    "cat /home/user/trace.ndjson 2>/dev/null | head -6 || echo '(none)'"
  );
  await ask("did anything escape the workspace?", "cat /tmp/outside.txt");

  await sandbox.kill();
  say("\nkilled");
};

await main();
