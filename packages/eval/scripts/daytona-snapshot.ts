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
const NAME = "anpord-eval:4";

const image = Image.debianSlim("3.13")
  .runCommands(
    "apt-get update && apt-get install -y curl git zstd ca-certificates bash",
    "curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs",
    "npm install -g bun",
    /* The home the adapter runs commands from, and the one HOME must name.
     Daytona's own image has both; a custom one has neither, and each absence
     fails in a way that describes something else: a missing directory reads as
     a missing shell, and a HOME pointing elsewhere leaves a harness reading an
     empty credential directory and reporting that the server rejected it. */
    "mkdir -p /home/daytona"
  )
  /* HOME as well as the directory. Commands run as root here, and a harness
     writes its credential to the adapter's home while reading it back from
     $HOME: when those differ it finds an empty directory, sends no token, and
     the server answers "missing bearer", which reads as a rejected credential
     rather than one that was never offered. */
  .env({ HOME: "/home/daytona" })
  .workdir("/home/daytona");

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
