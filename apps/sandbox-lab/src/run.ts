import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Sandbox } from "e2b";
import { Session } from "./session";

const KEY_PATH =
  process.env.E2B_KEY_FILE ??
  "/tmp/claude-501/-Users-charlielamb-Documents-anpord/12b411dd-d640-4169-a77f-0b9be144cdbd/scratchpad/e2b.key";

process.env.E2B_API_KEY ??= readFileSync(KEY_PATH, "utf8").trim();

const OUT = resolve(import.meta.dir, "../.sessions");
const WORKSPACE = "/home/user/workspace";

const say = (message: string) => process.stdout.write(`${message}\n`);

/**
 * The collector, written into the sandbox rather than installed from a
 * registry. A published package is the eventual shape; a file is enough to
 * learn whether the signals are there at all.
 */
const TRACE = readFileSync(
  resolve(
    import.meta.dir,
    "../../../packages/sandbox-watch/src/guest/trace.sh"
  ),
  "utf8"
);

const main = async () => {
  const id = `lab-${Date.now()}`;
  const session = new Session(id, OUT);

  say(`starting sandbox for ${id}`);
  const started = Date.now();
  const sandbox = await Sandbox.create({ timeoutMs: 10 * 60 * 1000 });
  session.record("sandbox.start", {
    bootMs: Date.now() - started,
    sandboxId: sandbox.sandboxId,
  });
  say(`  ${sandbox.sandboxId} in ${Date.now() - started}ms`);

  await sandbox.files.write("/home/user/trace.sh", TRACE);
  await session.run(sandbox, `mkdir -p ${WORKSPACE}`, { cwd: "/home/user" });

  /* Kernel inotify, so a write by a compiler or a package manager is seen the
     same as one the agent made itself. This is the signal a client-side
     wrapper cannot produce. */
  const files: { at: string; name: string; type: string }[] = [];
  const watcher = await sandbox.files.watchDir(
    WORKSPACE,
    (event) => {
      files.push({
        at: new Date().toISOString(),
        name: event.name,
        type: String(event.type),
      });
    },
    { recursive: true }
  );

  say("running the agent session");
  await agentSession(sandbox, session);

  say("collecting artefacts");
  const artefacts = await collect(sandbox, session, files);

  say("snapshotting");
  const snapshot = await sandbox
    .createSnapshot()
    .then((made) => made.snapshotId)
    .catch((cause: unknown) => `unavailable: ${String(cause).slice(0, 80)}`);
  session.record("snapshot", { snapshotId: snapshot });

  await watcher.stop();
  await sandbox.kill();
  session.record("sandbox.end", {});

  writeFileSync(
    resolve(OUT, `${id}.report.json`),
    `${JSON.stringify({ artefacts, events: session.events, files }, null, 2)}\n`
  );

  say(`\nwrote ${OUT}/${id}.ndjson`);
  say(`wrote ${OUT}/${id}.report.json`);
  say(
    `\ncommands ${session.events.filter((e) => e.kind === "command").length}`
  );
  say(`file events ${files.length}`);
  say(`snapshot ${snapshot}`);
};

/**
 * What a coding agent actually does, including the parts that go wrong: a
 * dependency install, a test suite that fails before it passes, a network
 * call that is allowed and one that is refused, a file written outside the
 * workspace, and a process that outlives the command that started it.
 */
const agentSession = async (sandbox: Sandbox, session: Session) => {
  const step = (command: string, options = {}) =>
    session.run(sandbox, command, options);

  await step(
    `cd ${WORKSPACE} && git init -q && git config user.email a@b.c && git config user.name Agent`
  );

  await sandbox.files.write(
    `${WORKSPACE}/calc.py`,
    "def add(a, b):\n    return a - b\n"
  );
  await sandbox.files.write(
    `${WORKSPACE}/test_calc.py`,
    "from calc import add\n\n\ndef test_add():\n    assert add(2, 3) == 5\n"
  );

  await step("git add -A && git commit -q -m 'initial' && git rev-parse HEAD");

  /* Fails, which is the point: an eval wants the exit code, not a judgement
     about whether the output looks like a failure. */
  await step("pip install --quiet pytest requests");

  /* No pipe: a pipeline exits with the last command status, so piping to tail
     reports tail succeeding and hides the failure the eval is looking for. */
  await step("python3 -m pytest test_calc.py -q", { expectFailure: true });

  await step("curl -s -o /dev/null -w '%{http_code}' https://pypi.org/simple/");

  await step(
    "curl -s -o /dev/null -m 5 -w '%{http_code}' https://example.com/ || echo blocked"
  );

  await step(
    "python3 -c \"import socket; print(socket.gethostbyname('github.com'))\""
  );

  /* Outside the workspace, so the inotify watch should not see it. Worth
     knowing where the blind spot is rather than assuming there is none. */
  await step("echo escaped > /tmp/outside.txt && cat /tmp/outside.txt");

  /* Survives the command that started it, which is the case a request-response
     wrapper reports as finished while work continues. */
  await step("nohup sleep 30 > /tmp/bg.log 2>&1 & echo started $!");

  await sandbox.files.write(
    `${WORKSPACE}/calc.py`,
    "def add(a, b):\n    return a + b\n"
  );

  await step("python3 -m pytest test_calc.py -q");

  await step("git add -A && git commit -q -m 'fix add' && git rev-parse HEAD");

  /* A shell nesting other commands: the journal sees one line, the trap sees
     each of them. */
  /* With the trap installed, a shell that nests other commands is no longer a
     single opaque line: the journal sees one command, the trap sees each. */
  await step(
    "BASH_ENV=/home/user/trace.sh ANPORD_TRACE_LOG=/home/user/trace.ndjson " +
      "bash -c 'echo one && echo two && false || echo three'"
  );
  await step("cat /home/user/trace.ndjson 2>/dev/null | head -20 || echo none");
};

const collect = async (
  sandbox: Sandbox,
  session: Session,
  files: unknown[]
) => {
  const read = async (path: string) =>
    await sandbox.files.read(path).catch(() => "");

  const log = await sandbox.commands
    .run(
      `cd ${WORKSPACE} && git log --format='%H %s' --shortstat | tr '\\n' '|'`
    )
    .catch(() => ({ stdout: "" }));

  const diff = await sandbox.commands
    .run(`cd ${WORKSPACE} && git diff HEAD~1 HEAD --stat`)
    .catch(() => ({ stdout: "" }));

  /* One file rather than a read per path: a source tree is thousands of
     round trips otherwise. */
  await sandbox.commands
    .run(
      `cd ${WORKSPACE} && git bundle create /tmp/workspace.bundle --all 2>/dev/null; tar czf /tmp/artefacts.tgz -C ${WORKSPACE} . 2>/dev/null; ls -la /tmp/*.tgz /tmp/*.bundle`
    )
    .catch(() => ({ stdout: "" }));

  const listing = await sandbox.files.list(WORKSPACE, { depth: 3 });

  const artefacts = {
    bundleBytes: (
      await sandbox.commands
        .run("stat -c %s /tmp/workspace.bundle 2>/dev/null || echo 0")
        .catch(() => ({ stdout: "0" }))
    ).stdout.trim(),
    calc: await read(`${WORKSPACE}/calc.py`),
    fileEvents: files.length,
    gitLog: log.stdout.trim(),
    lastDiff: diff.stdout.trim(),
    tarBytes: (
      await sandbox.commands
        .run("stat -c %s /tmp/artefacts.tgz 2>/dev/null || echo 0")
        .catch(() => ({ stdout: "0" }))
    ).stdout.trim(),
    workspace: listing.map((entry) => entry.name),
  };

  session.record("artefacts", artefacts);
  return artefacts;
};

await main();
