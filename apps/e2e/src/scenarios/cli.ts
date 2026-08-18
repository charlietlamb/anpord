import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contains, equals, isTrue } from "../harness/expect";
import type { Scenario } from "../harness/run";
import type { World } from "../world";

interface CliResult {
  readonly code: number;
  readonly stderr: string;
  readonly stdout: string;
}

/**
 * The CLI entrypoint through bun rather than a built binary, so a run needs no
 * publish step and still exercises the same command definitions.
 */
const cli = (
  world: World,
  args: readonly string[],
  stdin?: string
): Promise<CliResult> =>
  new Promise((resolve) => {
    const child = spawn(
      "bun",
      [
        "run",
        join(world.repositoryRoot, "packages/sdk/src/cli/main.ts"),
        ...args,
      ],
      {
        cwd: world.directory,
        env: {
          ...process.env,
          ANPORD_API_KEY: world.writeKey.key,
          ANPORD_BASE_URL: world.baseUrl,
        },
      }
    );

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    if (stdin !== undefined) {
      child.stdin.write(stdin);
    }
    child.stdin.end();

    child.on("close", (code) => resolve({ code: code ?? 1, stderr, stdout }));
  });

/** The prompt the CLI scenarios own. Created over HTTP so these scenarios do
 * not inherit whatever the API and SDK ones happened to leave behind. */
const CLI_PROMPT = "cli-workflow";

const createOverHttp = (world: World, id: string, content: string) =>
  fetch(`${world.baseUrl}/v1/prompts.create`, {
    body: JSON.stringify({ content, id, name: "Cli workflow" }),
    headers: {
      authorization: `Bearer ${world.writeKey.key}`,
      "content-type": "application/json",
    },
    method: "POST",
  });

const VERSION_IN_NOTE = /v(\d+)/;

/** Push reports the version it wrote, so a scenario can read that exact
 * version back rather than assuming how many ran before it. */
const pushedVersion = (result: CliResult) => {
  const found = result.stderr.match(VERSION_IN_NOTE);
  if (!found?.[1]) {
    throw new Error(`Could not read a version from ${result.stderr}`);
  }
  return found[1];
};

export const cliScenarios: readonly Scenario<World>[] = [
  {
    name: "cli: push adds a version and get prints the content on stdout",
    run: async (world) => {
      await createOverHttp(world, CLI_PROMPT, "Original body.");

      const pushed = await cli(world, [
        "push",
        CLI_PROMPT,
        "Answer {{customer_name}} politely.",
        "-m",
        "from the cli",
      ]);

      equals("push exits cleanly", pushed.code, 0);
      contains("reports the new version", pushed.stderr, CLI_PROMPT);

      /** Push adds a version, it does not ship one, so the pushed body is
       * read by version rather than from the production channel. */
      const read = await cli(world, [
        "get",
        CLI_PROMPT,
        "--at",
        pushedVersion(pushed),
      ]);
      equals("get exits cleanly", read.code, 0);
      contains("content is on stdout", read.stdout, "Answer");
    },
  },
  {
    name: "cli: push reads content from stdin",
    run: async (world) => {
      const pushed = await cli(
        world,
        ["push", CLI_PROMPT, "-"],
        "Body delivered over stdin."
      );
      equals("push exits cleanly", pushed.code, 0);

      const read = await cli(world, [
        "get",
        CLI_PROMPT,
        "--at",
        pushedVersion(pushed),
      ]);
      contains("stdin content is live", read.stdout, "stdin");
    },
  },
  {
    name: "cli: list prints rows on stdout so they can be piped",
    run: async (world) => {
      const listed = await cli(world, ["list"]);

      equals("list exits cleanly", listed.code, 0);
      contains("includes a known prompt", listed.stdout, CLI_PROMPT);
    },
  },
  {
    name: "cli: promote points a channel and get --channel follows it",
    run: async (world) => {
      await cli(world, ["push", CLI_PROMPT, "promoted body"]);

      const versions = await cli(world, ["versions", CLI_PROMPT]);
      equals("versions exits cleanly", versions.code, 0);

      const history = JSON.parse(versions.stdout) as readonly {
        readonly version: number;
      }[];
      const latest = history[0]?.version ?? 1;

      const promoted = await cli(world, [
        "promote",
        CLI_PROMPT,
        "--to",
        "production",
        "--at",
        String(latest),
      ]);
      equals("promote exits cleanly", promoted.code, 0);

      const read = await cli(world, [
        "get",
        CLI_PROMPT,
        "--channel",
        "production",
      ]);
      contains(
        "channel serves the promoted body",
        read.stdout,
        "promoted body"
      );
    },
  },
  {
    name: "cli: get --json prints a machine readable prompt",
    run: async (world) => {
      const read = await cli(world, ["get", CLI_PROMPT, "--json"]);

      equals("exits cleanly", read.code, 0);

      const prompt = JSON.parse(read.stdout) as {
        readonly id: string;
        readonly version: number;
      };
      equals("id round trips", prompt.id, CLI_PROMPT);
      isTrue(
        "carries a version",
        Number.isInteger(prompt.version),
        `expected a version, got ${prompt.version}`
      );
    },
  },
  {
    name: "cli: get --at pins an exact version",
    run: async (world) => {
      const pinned = await cli(world, [
        "get",
        CLI_PROMPT,
        "--at",
        "1",
        "--json",
      ]);

      equals("exits cleanly", pinned.code, 0);

      const prompt = JSON.parse(pinned.stdout) as { readonly version: number };
      equals("serves the first version", prompt.version, 1);
    },
  },
  {
    name: "cli: gen writes declarations naming each prompt's variables",
    run: async (world) => {
      await createOverHttp(
        world,
        "cli-variables",
        "Hello {{ customer_name }}, from {{product}}."
      );

      const generated = await cli(world, ["gen", "--out", "anpord-env.d.ts"]);
      equals("gen exits cleanly", generated.code, 0);

      const declarations = readFileSync(
        join(world.directory, "anpord-env.d.ts"),
        "utf8"
      );

      contains("augments the sdk", declarations, 'import "anpord"');
      contains("declares the registry", declarations, "AnpordPromptVariables");
      contains("includes the prompt", declarations, "cli-variables");
      contains("names a spaced variable", declarations, "customer_name");
      contains("names the other variable", declarations, "product");
    },
  },
  {
    name: "cli: generate is the same command under a longer name",
    run: async (world) => {
      const generated = await cli(world, [
        "generate",
        "--out",
        "generated-long.d.ts",
      ]);

      equals("generate exits cleanly", generated.code, 0);

      const long = readFileSync(
        join(world.directory, "generated-long.d.ts"),
        "utf8"
      );
      const short = readFileSync(
        join(world.directory, "anpord-env.d.ts"),
        "utf8"
      );

      equals("both commands agree", long, short);
    },
  },
  {
    name: "cli: a missing prompt fails without a stack trace",
    run: async (world) => {
      const missing = await cli(world, ["get", "no-such-prompt-at-all"]);

      isTrue(
        "exits non zero",
        missing.code !== 0,
        `expected a failure, got ${missing.code}`
      );
      isTrue(
        "no stack trace leaks",
        !`${missing.stdout}${missing.stderr}`.includes("    at "),
        "a stack trace reached the terminal"
      );
    },
  },
];
