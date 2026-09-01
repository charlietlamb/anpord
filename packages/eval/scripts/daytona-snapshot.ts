import { Daytona, Image } from "@daytonaio/sdk";

/**
 * Builds the snapshot every eval sandbox starts from.
 *
 * Daytona refuses resources alongside its default snapshot, and that default
 * gives three gigabytes, which a dependency tree fills before an install
 * finishes. Naming one of our own is the only way to ask for more, and a
 * sandbox starts from it in about a second rather than the forty a build takes.
 *
 * Run when the name in daytona.ts changes:
 *   bun --env-file=../../.env run scripts/daytona-snapshot.ts
 */
const NAME = "anpord-eval:3";

const image = Image.debianSlim("3.13").runCommands(
  "apt-get update && apt-get install -y curl git zstd ca-certificates bash",
  "curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs",
  "npm install -g bun",
  /* The home the adapter runs commands from. Daytona's own image has it and a
     custom one does not, and a command given a directory that is not there
     fails with "fork/exec /usr/bin/bash: no such file or directory", which
     describes neither the directory nor the command. */
  "mkdir -p /home/daytona"
);

const daytona = new Daytona();

await daytona.snapshot.create(
  {
    image,
    name: NAME,
    /* Ten gigabytes is the per-sandbox ceiling this account allows. */
    resources: { cpu: 2, disk: 10, memory: 4 },
  } as never,
  {
    onLogs: (line: string) => process.stdout.write(line),
    timeout: 1200,
  } as never
);

process.stdout.write(`\n${NAME} is ready\n`);
