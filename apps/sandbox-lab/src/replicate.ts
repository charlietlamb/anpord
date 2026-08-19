import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Sandbox } from "e2b";
import { Session } from "./session";

const KEY_PATH =
  process.env.E2B_KEY_FILE ??
  "/tmp/claude-501/-Users-charlielamb-Documents-anpord/12b411dd-d640-4169-a77f-0b9be144cdbd/scratchpad/e2b.key";

process.env.E2B_API_KEY ??= readFileSync(KEY_PATH, "utf8").trim();

const OUT = resolve(import.meta.dir, "../.sessions");
const WORKSPACE = "/home/user/work";
const say = (message: string) => process.stdout.write(`${message}\n`);

interface Recorded {
  readonly data: Record<string, unknown>;
  readonly kind: string;
}

/**
 * Whether the record is enough to rebuild the run.
 *
 * Capture a session, then drive a second sandbox from the captured commands
 * alone and compare the two. What matches is what the record genuinely holds;
 * what diverges is what it only appeared to hold, which is the more useful
 * half of the answer.
 */
const main = async () => {
  const id = `rep-${Date.now()}`;

  say("=== original ===");
  const original = new Session(`${id}-a`, OUT);
  const first = await Sandbox.create({ timeoutMs: 10 * 60 * 1000 });
  say(`sandbox ${first.sandboxId}`);

  await original.run(first, `mkdir -p ${WORKSPACE}`, { cwd: "/home/user" });

  const seen: string[] = [];
  const watcher = await first.files.watchDir(
    WORKSPACE,
    (event) => {
      seen.push(event.name);
    },
    { recursive: true }
  );

  for (const command of SCRIPT) {
    await original.run(first, command, { cwd: WORKSPACE });
  }

  const before = await fingerprint(first, original);
  const snapshot = await first
    .createSnapshot()
    .then((made) => made.snapshotId)
    .catch(() => "unavailable");

  await watcher.stop();
  await first.kill();
  say(`captured ${original.events.length} events, ${seen.length} file events`);

  say("\n=== replay from the record alone ===");
  const replayed = new Session(`${id}-b`, OUT);
  const second = await Sandbox.create({ timeoutMs: 10 * 60 * 1000 });
  say(`sandbox ${second.sandboxId}`);

  await replayed.run(second, `mkdir -p ${WORKSPACE}`, { cwd: "/home/user" });

  /* Only the recorded commands, in the recorded order. Nothing is carried
     across from the first sandbox, so anything that matches was genuinely
     reconstructed rather than remembered. */
  const commands = original.events
    .filter((event) => event.kind === "command")
    .map((event) => String((event.data as { command: string }).command))
    .filter((command) => !command.startsWith("mkdir -p"));

  for (const command of commands) {
    await replayed.run(second, command, { cwd: WORKSPACE });
  }

  const after = await fingerprint(second, replayed);
  await second.kill();

  say("\n=== comparison ===");
  const report = compare(before, after, original.events, replayed.events);

  for (const line of report.lines) {
    say(`  ${line}`);
  }

  writeFileSync(
    resolve(OUT, `${id}.replication.json`),
    `${JSON.stringify({ after, before, report, snapshot }, null, 2)}\n`
  );
  say(`\nwrote ${OUT}/${id}.replication.json`);
};

/** Work with a dependency, a failing test, a fix, and a build artefact, which
 * is the shape of most of what an agent is asked to do. */
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

/** What a run leaves behind, reduced to things that should match if the
 * replay really rebuilt it. Timestamps and object hashes are deliberately
 * absent: they differ by construction and would drown the signal. */
const fingerprint = async (sandbox: Sandbox, session: Session) => {
  const ask = async (command: string) =>
    (
      await sandbox.commands
        .run(command, { cwd: WORKSPACE })
        .catch(() => ({ stdout: "" }))
    ).stdout.trim();

  const found = {
    commits: await ask("git log --format='%s' | tr '\\n' ','"),
    files: await ask("ls -1 | sort | tr '\\n' ','"),
    libContent: await ask("cat lib.py"),
    pytestVersion: await ask("python3 -m pytest --version 2>&1 | head -1"),
    testResult: await ask("python3 -m pytest test_lib.py -q 2>&1 | tail -1"),
    treeHash: await ask("git rev-parse HEAD^{tree}"),
    /* The tree hash covers what git tracks, so a difference there and not
       here would mean the content matched while the commit did not. */
    /* Bytecode is excluded, not ignored: a .pyc embeds the source mtime, so
       it differs between two runs of identical source by construction and
       would report a divergence that is not one. */
    sourceHashes: await ask(
      "git ls-files | grep -v __pycache__ | sort | xargs sha256sum | tr '\\n' ','"
    ),
    sourceTree: await ask(
      "git ls-tree -r HEAD | grep -v __pycache__ | sort | tr '\\n' ','"
    ),
  };

  session.record("fingerprint", found);
  return found;
};

const compare = (
  before: Record<string, string>,
  after: Record<string, string>,
  originalEvents: readonly Recorded[],
  replayedEvents: readonly Recorded[]
) => {
  const lines: string[] = [];
  let matched = 0;
  let total = 0;

  for (const key of Object.keys(before)) {
    total += 1;
    const same = before[key] === after[key];
    if (same) {
      matched += 1;
    }
    lines.push(
      `${same ? "same" : "DIFF"}  ${key}${same ? "" : `\n        a: ${before[key]?.slice(0, 90)}\n        b: ${after[key]?.slice(0, 90)}`}`
    );
  }

  const exits = (events: readonly Recorded[]) =>
    events
      .filter((event) => event.kind === "command")
      .map((event) => String((event.data as { exitCode: number }).exitCode))
      .join(",");

  const originalExits = exits(originalEvents);
  const replayedExits = exits(replayedEvents);
  const exitsMatch = originalExits === replayedExits;

  lines.push(
    `${exitsMatch ? "same" : "DIFF"}  exit codes${exitsMatch ? "" : `\n        a: ${originalExits}\n        b: ${replayedExits}`}`
  );

  return { lines, matched, total: total + 1 };
};

await main();
