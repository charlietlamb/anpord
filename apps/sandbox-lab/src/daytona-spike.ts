import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Daytona, type Sandbox } from "@daytonaio/sdk";

const KEY_PATH =
  process.env.DAYTONA_KEY_FILE ??
  "/tmp/claude-501/-Users-charlielamb-Documents-anpord/12b411dd-d640-4169-a77f-0b9be144cdbd/scratchpad/daytona.key";

process.env.DAYTONA_API_KEY ??= readFileSync(KEY_PATH, "utf8").trim();

const OUT = resolve(import.meta.dir, "../.sessions");
const WORKSPACE = "/home/daytona/repo";
const say = (message: string) => process.stdout.write(`${message}\n`);

interface Ran {
  readonly command: string;
  readonly durationMs: number;
  readonly exitCode: number;
  readonly stdout: string;
}

/** Seconds. Without it executeCommand waits forever, so one slow install
 * hangs the whole capture with nothing written. */
const COMMAND_TIMEOUT_S = 120;

const run = async (sandbox: Sandbox, command: string): Promise<Ran> => {
  const started = Date.now();
  const result = await sandbox.process
    .executeCommand(command, WORKSPACE, undefined, COMMAND_TIMEOUT_S)
    .catch((cause: { exitCode?: number; result?: string }) => ({
      exitCode: cause.exitCode ?? 1,
      result: cause.result ?? String(cause),
    }));

  return {
    command,
    durationMs: Date.now() - started,
    exitCode: result.exitCode ?? 0,
    stdout: (result.result ?? "").slice(0, 2000),
  };
};

/**
 * Everything the E2B spike measured, asked of Daytona: whether the same work
 * produces the same record, and where the answer is no. The edge cases are the
 * point rather than the happy path, since each one is a way a capture reports
 * success while the run did something else.
 */
const main = async () => {
  const id = `dspike-${Date.now()}`;
  const daytona = new Daytona();
  const journal: Ran[] = [];

  const started = Date.now();
  const sandbox = await daytona.create();
  const bootMs = Date.now() - started;
  say(`sandbox ${sandbox.id} in ${bootMs}ms`);

  const step = async (command: string) => {
    const ran = await run(sandbox, command);
    journal.push(ran);
    say(
      `  [${String(ran.exitCode).padStart(3)}] ${String(ran.durationMs).padStart(6)}ms ${command.slice(0, 52)}`
    );
    return ran;
  };

  /* Created from the parent: the runner resolves cwd before running, so
     asking to make a directory while already standing in it never returns. */
  await sandbox.process.executeCommand(
    `mkdir -p ${WORKSPACE}`,
    "/home/daytona",
    undefined,
    30
  );

  say("real work");
  await step(
    "git clone --depth 1 https://github.com/pallets/click.git . 2>&1 | tail -1"
  );
  await step("git log -1 --format='%H %s'");
  await step("pip install --quiet -e . 2>&1 | tail -1");
  await step("python3 -m pytest tests/test_basic.py -q 2>&1 | tail -2");

  say("edge cases");
  const edges = {
    /* A pipeline exits with its last command, so a failing suite reports the
       success of tail. The only fix is not to pipe. */
    pipedFailure: await step("python3 -m pytest /nonexistent -q | tail -1"),
    unpipedFailure: await step("python3 -m pytest /nonexistent -q > /dev/null"),
    missingCommand: await step("this-command-does-not-exist"),
    nonTerminating: await step("timeout 3 tail -f /dev/null; echo exit=$?"),
    background: await step("nohup sleep 30 > /tmp/bg.log 2>&1 & echo pid=$!"),
    outsideWorkspace: await step(
      "echo hidden > /tmp/outside.txt && cat /tmp/outside.txt"
    ),
    /* Present while it runs and absent afterwards, so a snapshot alone cannot
       show it happened. */
    writeThenDelete: await step(
      "echo transient > gone.txt && rm gone.txt && echo removed"
    ),
    largeOutput: await step("python3 -c \"print('x' * 200000)\" | wc -c"),
    networkAllowed: await step(
      "curl -s -o /dev/null -w '%{http_code}' https://pypi.org/simple/"
    ),
    networkArbitrary: await step(
      "curl -s -o /dev/null -m 5 -w '%{http_code}' https://example.com/ || echo blocked"
    ),
    dnsResolution: await step(
      "python3 -c \"import socket; print(socket.gethostbyname('github.com'))\""
    ),
  };

  /* The session API is skipped. executeSessionCommand takes no timeout and
     does not return: a run that reaches it never finishes and never writes,
     which is worse than the history it would have provided. executeCommand
     takes a timeout and behaves, so the journal comes from there instead. */
  const serverSide: { command: string; exitCode?: number }[] = [];
  const sessions = 0;

  say("artefacts");
  const artefacts = {
    bundleBytes: (
      await step(
        "git bundle create /tmp/w.bundle --all 2>/dev/null; stat -c %s /tmp/w.bundle 2>/dev/null || echo 0"
      )
    ).stdout.trim(),
    diffStat: (
      await step("git diff HEAD~1 HEAD --stat | tail -1")
    ).stdout.trim(),
    gitLog: (await step("git log --format='%h %s' | head -3")).stdout.trim(),
    processes: (
      await step("ps -eo pid,comm --no-headers | wc -l")
    ).stdout.trim(),
    treeFiles: (await step("git ls-files | wc -l")).stdout.trim(),
  };

  const listed = await sandbox.fs
    .listFiles(WORKSPACE)
    .then((found) => found.length)
    .catch(() => -1);

  const snapshot = await sandbox
    .createSnapshot?.(`${id}-snap`)
    .then(() => `${id}-snap`)
    .catch((cause: unknown) => `unavailable: ${String(cause).slice(0, 60)}`);

  await sandbox.delete();

  const report = {
    artefacts,
    bootMs,
    edges: Object.fromEntries(
      Object.entries(edges).map(([key, ran]) => [
        key,
        { exitCode: ran.exitCode, stdout: ran.stdout.trim().slice(0, 100) },
      ])
    ),
    journal,
    listedFiles: listed,
    sessions,
    serverSide,
    snapshot,
  };

  writeFileSync(
    resolve(OUT, `${id}.spike.json`),
    `${JSON.stringify(report, null, 2)}\n`
  );

  say("\n=== edge cases ===");
  for (const [key, ran] of Object.entries(edges)) {
    say(
      `  [${String(ran.exitCode).padStart(3)}] ${key.padEnd(18)} ${ran.stdout.trim().split("\n").pop()?.slice(0, 46) ?? ""}`
    );
  }

  say(`\nprovider-held history: ${serverSide.length} commands`);
  for (const entry of serverSide) {
    say(`  exit ${String(entry.exitCode).padStart(3)} :: ${entry.command}`);
  }

  say(`\nsessions listed: ${sessions}`);
  say(`files listed: ${listed}`);
  say(
    `bundle: ${artefacts.bundleBytes} bytes, tracked files: ${artefacts.treeFiles}`
  );
  say(`snapshot: ${snapshot}`);
  say(`\nwrote ${OUT}/${id}.spike.json`);
};

await main();
