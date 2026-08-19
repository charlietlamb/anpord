import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync, watch } from "node:fs";
import { join } from "node:path";
import { Collector } from "./collector";

const argv = process.argv.slice(2);
const flag = (name: string, fallback?: string) => {
  const at = argv.indexOf(`--${name}`);
  return at === -1 ? fallback : argv[at + 1];
};

const sessionId = flag("session") ?? `session-${Date.now()}`;
const ingest = flag("ingest");
const workspace = flag("workspace", "/workspace") as string;
const logs = flag("logs", "/var/log/anpord") as string;

const DNS_QUERY = /query\[[A-Z]+\] (\S+) from (\S+)/;
const FILES_CHANGED = /(\d+) files? changed/;
const INSERTIONS = /(\d+) insertions?/;
const DELETIONS = /(\d+) deletions?/;

const collector = new Collector({ directory: logs, ingest, sessionId });
collector.start();

/**
 * The trap writes faster than a reader should poll, so the file is followed
 * from the end rather than re-read. Lines arrive whole because each printf is
 * a single append under the 4KB the kernel writes atomically.
 */
const followTrace = () => {
  const file = join(logs, "trace.ndjson");
  let offset = existsSync(file) ? statSync(file).size : 0;

  const drain = () => {
    if (!existsSync(file)) {
      return;
    }

    const size = statSync(file).size;
    if (size <= offset) {
      offset = size;
      return;
    }

    const chunk = readFileSync(file).subarray(offset, size).toString();
    offset = size;

    for (const line of chunk.split("\n")) {
      if (line.trim().length === 0) {
        continue;
      }
      try {
        collector.emit("command", JSON.parse(line));
      } catch {
        /* A truncated tail is read again on the next pass. */
      }
    }
  };

  setInterval(drain, 500);
};

const describe = (exists: boolean, event: string) => {
  if (!exists) {
    return "remove";
  }
  return event === "rename" ? "create" : "write";
};

/** Every write inside the workspace, whoever made it. This is the signal a
 * client-side wrapper cannot produce: a compiler or a package manager writes
 * thousands of files the caller never named. */
const watchWorkspace = () => {
  if (!existsSync(workspace)) {
    return;
  }

  watch(workspace, { recursive: true }, (event, name) => {
    if (!name || name.includes(".git/")) {
      return;
    }

    const full = join(workspace, name);
    const exists = existsSync(full);

    const op = describe(exists, event);

    collector.emit("file", {
      op,
      path: name,
      size: exists && statSync(full).isFile() ? statSync(full).size : undefined,
    });
  });
};

/** dnsmasq names every destination regardless of protocol, which is the only
 * coverage that does not depend on the client honouring a proxy. */
const followDns = () => {
  const file = "/var/log/dnsmasq.log";
  let offset = existsSync(file) ? statSync(file).size : 0;

  setInterval(() => {
    if (!existsSync(file)) {
      return;
    }

    const size = statSync(file).size;
    if (size <= offset) {
      offset = size;
      return;
    }

    const chunk = readFileSync(file).subarray(offset, size).toString();
    offset = size;

    for (const line of chunk.split("\n")) {
      const found = line.match(DNS_QUERY);
      if (found) {
        collector.emit("dns", { client: found[2], name: found[1] });
      }
    }
  }, 500);
};

/** A commit per turn turns a snapshot into an ordered record: the tree alone
 * says what the agent built, the history says how it got there. */
const checkpoint = (label: string) =>
  new Promise<void>((resolve) => {
    const git = spawn(
      "bash",
      [
        "-lc",
        `cd ${workspace} && git add -A && git commit -q --allow-empty -m "${label}" && git log -1 --format=%H --shortstat`,
      ],
      { env: { ...process.env, BASH_ENV: "" } }
    );

    let out = "";
    git.stdout.on("data", (chunk) => {
      out += String(chunk);
    });

    git.on("close", () => {
      const [sha, stat] = out.trim().split("\n");
      const files = Number(stat?.match(FILES_CHANGED)?.[1] ?? 0);
      const insertions = Number(stat?.match(INSERTIONS)?.[1] ?? 0);
      const deletions = Number(stat?.match(DELETIONS)?.[1] ?? 0);

      collector.emit("commit", {
        deletions,
        files,
        insertions,
        message: label,
        sha: sha ?? "",
      });
      resolve();
    });
  });

followTrace();
watchWorkspace();
followDns();

process.on("SIGTERM", async () => {
  await checkpoint("session end");
  await collector.stop();
  process.exit(0);
});

process.stdout.write(`anpord watch: session ${sessionId}\n`);
process.stdout.write(`  workspace ${workspace}\n`);
process.stdout.write(`  logs      ${logs}\n`);
process.stdout.write(`  ingest    ${ingest ?? "(disk only)"}\n`);
