import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Daytona, type Sandbox } from "@daytonaio/sdk";

const KEY_PATH =
  process.env.DAYTONA_KEY_FILE ??
  "/tmp/claude-501/-Users-charlielamb-Documents-anpord/12b411dd-d640-4169-a77f-0b9be144cdbd/scratchpad/daytona.key";

process.env.DAYTONA_API_KEY ??= readFileSync(KEY_PATH, "utf8").trim();

const OUT = resolve(import.meta.dir, "../.sessions");
const WORKSPACE = "/home/daytona/work";
const say = (message: string) => process.stdout.write(`${message}\n`);

interface Ran {
  readonly command: string;
  readonly durationMs: number;
  readonly exitCode: number;
  readonly stdout: string;
}

/** The same work as the E2B run, so the two records are comparable rather
 * than merely similar. */
const SCRIPT = [
  "git init -q && git config user.email a@b.c && git config user.name Agent",
  "pip install --quiet pytest 2>&1 | tail -1",
  "printf 'def total(items):\\n    return sum(items) - 1\\n' > lib.py",
  "printf 'from lib import total\\n\\n\\ndef test_total():\\n    assert total([1, 2, 3]) == 6\\n' > test_lib.py",
  "git add -A && git commit -q -m initial && git rev-parse HEAD",
  "python3 -m pytest test_lib.py -q",
  "printf 'def total(items):\\n    return sum(items)\\n' > lib.py",
  "python3 -m pytest test_lib.py -q",
  "git add -A && git commit -q -m fix && git rev-parse HEAD",
  'python3 -c "import lib; print(lib.total([4, 5, 6]))"',
  "tar czf /tmp/out.tgz lib.py test_lib.py && stat -c %s /tmp/out.tgz",
];

const run = async (sandbox: Sandbox, command: string): Promise<Ran> => {
  const started = Date.now();
  const result = await sandbox.process
    .executeCommand(command, WORKSPACE)
    .catch((cause: { exitCode?: number; result?: string }) => ({
      exitCode: cause.exitCode ?? 1,
      result: cause.result ?? String(cause),
    }));

  return {
    command,
    durationMs: Date.now() - started,
    exitCode: result.exitCode ?? 0,
    stdout: (result.result ?? "").slice(0, 4000),
  };
};

const fingerprint = async (sandbox: Sandbox) => {
  const ask = async (command: string) =>
    ((await run(sandbox, command)).stdout ?? "").trim();

  return {
    commits: await ask("git log --format='%s' | tr '\\n' ','"),
    files: await ask("ls -1 | sort | tr '\\n' ','"),
    libContent: await ask("cat lib.py"),
    pytestVersion: await ask("python3 -m pytest --version 2>&1 | head -1"),
    sourceHashes: await ask(
      "git ls-files | grep -v __pycache__ | sort | xargs sha256sum | tr '\\n' ','"
    ),
    sourceTree: await ask(
      "git ls-tree -r HEAD | grep -v __pycache__ | sort | tr '\\n' ','"
    ),
    testResult: await ask("python3 -m pytest test_lib.py -q 2>&1 | tail -1"),
  };
};

/**
 * The same experiment as the E2B one: capture a run, rebuild it in a fresh
 * sandbox from the record alone, and see what agrees. Running it on a second
 * provider is what separates a portable record from one that only worked
 * because of the machine it was made on.
 */
const main = async () => {
  const id = `dtn-${Date.now()}`;
  const daytona = new Daytona();

  say("=== original ===");
  const started = Date.now();
  const first = await daytona.create();
  say(`sandbox ${first.id} in ${Date.now() - started}ms`);

  await run(first, `mkdir -p ${WORKSPACE}`);
  const original: Ran[] = [];
  for (const command of SCRIPT) {
    original.push(await run(first, command));
  }
  const before = await fingerprint(first);

  /* Daytona keeps the command list itself, which E2B does not. Worth reading
     back to see what the provider knows without being told. */
  const sessionId = `probe-${id}`;
  await first.process.createSession(sessionId);
  await first.process.executeSessionCommand(sessionId, {
    command: "echo from-session && false",
    runAsync: false,
  });
  const serverSide = await first.process
    .getSession(sessionId)
    .then((found) => found.commands ?? [])
    .catch(() => []);

  const snapshot = await first
    .createSnapshot?.(`${id}-snap`)
    .then(() => `${id}-snap`)
    .catch((cause: unknown) => `unavailable: ${String(cause).slice(0, 60)}`);

  await first.delete();
  say(`captured ${original.length} commands`);

  say("\n=== replay from the record alone ===");
  const second = await daytona.create();
  say(`sandbox ${second.id}`);

  await run(second, `mkdir -p ${WORKSPACE}`);
  const replayed: Ran[] = [];
  for (const recorded of original) {
    replayed.push(await run(second, recorded.command));
  }
  const after = await fingerprint(second);
  await second.delete();

  say("\n=== comparison ===");
  const lines: string[] = [];
  for (const key of Object.keys(before) as (keyof typeof before)[]) {
    const same = before[key] === after[key];
    lines.push(`${same ? "same" : "DIFF"}  ${key}`);
    if (!same) {
      lines.push(`        a: ${before[key]?.slice(0, 80)}`);
      lines.push(`        b: ${after[key]?.slice(0, 80)}`);
    }
  }

  const exitsA = original.map((r) => r.exitCode).join(",");
  const exitsB = replayed.map((r) => r.exitCode).join(",");
  lines.push(`${exitsA === exitsB ? "same" : "DIFF"}  exit codes`);
  if (exitsA !== exitsB) {
    lines.push(`        a: ${exitsA}`);
    lines.push(`        b: ${exitsB}`);
  }

  for (const line of lines) {
    say(`  ${line}`);
  }

  say(`\nprovider-held command history: ${serverSide.length} entries`);
  for (const entry of serverSide) {
    say(`  exit ${entry.exitCode} :: ${entry.command}`);
  }
  say(`snapshot: ${snapshot}`);

  writeFileSync(
    resolve(OUT, `${id}.daytona.json`),
    `${JSON.stringify({ after, before, original, replayed, serverSide, snapshot }, null, 2)}\n`
  );
  say(`\nwrote ${OUT}/${id}.daytona.json`);
};

await main();
