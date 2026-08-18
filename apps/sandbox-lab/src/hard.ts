import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Sandbox } from "e2b";
import { Session } from "./session";

const KEY_PATH =
  process.env.E2B_KEY_FILE ??
  "/tmp/claude-501/-Users-charlielamb-Documents-anpord/12b411dd-d640-4169-a77f-0b9be144cdbd/scratchpad/e2b.key";

process.env.E2B_API_KEY ??= readFileSync(KEY_PATH, "utf8").trim();

const OUT = resolve(import.meta.dir, "../.sessions");
const WORKSPACE = "/home/user/repo";
const say = (message: string) => process.stdout.write(`${message}\n`);

/**
 * The cases a naive capture gets wrong: a real dependency install writing
 * thousands of files nobody named, a command whose exit code a pipe hides, a
 * process still running when the command returns, work outside the watched
 * directory, output too large to keep, and a command that never terminates.
 */
const main = async () => {
  const id = `hard-${Date.now()}`;
  const session = new Session(id, OUT);

  const sandbox = await Sandbox.create({ timeoutMs: 15 * 60 * 1000 });
  session.record("sandbox.start", { sandboxId: sandbox.sandboxId });
  say(`sandbox ${sandbox.sandboxId}`);

  await session.run(sandbox, `mkdir -p ${WORKSPACE}`, { cwd: "/home/user" });

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

  const step = (command: string, options = {}) =>
    session.run(sandbox, command, { cwd: WORKSPACE, ...options });

  say("cloning a real repository");
  await step(
    "git clone --depth 1 https://github.com/pallets/click.git . 2>&1 | tail -2"
  );
  await step("git log -1 --format='%H %s'");

  say("installing dependencies");
  const install = await step("pip install --quiet -e . 2>&1 | tail -3");
  session.record("note", {
    filesAfterInstall: files.length,
    installExit: install.exitCode,
  });

  say("running a real test suite");
  await step("python3 -m pytest tests -q -x --timeout=60 2>&1 | tail -6");

  /* The pipeline's status is tail's, so a failing suite reports success. The
     journal cannot know that; only running it unpiped can. */
  await step("python3 -m pytest tests/test_basic.py -q | tail -2");
  await step("python3 -m pytest tests/test_basic.py -q > /dev/null");

  say("edge cases");

  /* Larger than anything worth keeping inline, so the record has to decide
     what to drop rather than pretending it kept everything. */
  await step("python3 -c \"print('x' * 200000)\" | wc -c");

  /* Still running when the command returns. */
  await step(
    "nohup python3 -m http.server 8099 > /tmp/serve.log 2>&1 & echo $!"
  );
  await step(
    "sleep 1 && curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8099/"
  );

  /* Outside the watched directory. */
  await step(
    "mkdir -p /tmp/elsewhere && echo hidden > /tmp/elsewhere/file.txt"
  );

  /* Never terminates on its own. */
  await step("timeout 3 tail -f /dev/null; echo 'timed out with' $?");

  /* Fails outright rather than returning a status. */
  await step("this-command-does-not-exist", { expectFailure: true });

  /* Writes then deletes, so the tree at the end shows nothing happened. */
  await step("echo transient > ephemeral.txt && rm ephemeral.txt && echo gone");

  say("collecting");
  const listing = await sandbox.files.list(WORKSPACE, { depth: 1 });
  const processes = await step("ps -eo pid,comm --no-headers | head -20");

  const artefacts = {
    distinctPaths: new Set(files.map((f) => f.name)).size,
    fileEvents: files.length,
    processes: processes.stdout.trim().split("\n").length,
    topLevel: listing.length,
  };
  session.record("artefacts", artefacts);

  const snapshot = await sandbox
    .createSnapshot()
    .then((made) => made.snapshotId)
    .catch(() => "unavailable");
  session.record("snapshot", { snapshotId: snapshot });

  await watcher.stop();
  await sandbox.kill();

  writeFileSync(
    resolve(OUT, `${id}.report.json`),
    `${JSON.stringify({ artefacts, events: session.events, files: files.slice(0, 400) }, null, 2)}\n`
  );

  say(`\nfile events ${files.length} across ${artefacts.distinctPaths} paths`);
  say(`snapshot ${snapshot}`);
  say(`wrote ${OUT}/${id}.report.json`);
};

await main();
