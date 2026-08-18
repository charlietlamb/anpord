import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cli, pushedVersion } from "../harness/cli";
import { contains, equals, isTrue } from "../harness/expect";
import { givenPrompt } from "../harness/given";
import type { Scenario } from "../harness/run";
import type { World } from "../world";

const declarations = (world: World, file: string) =>
  readFileSync(join(world.directory, file), "utf8");

export const cliScenarios: readonly Scenario<World>[] = [
  {
    name: "cli: push drafts a version, readable by number rather than live",
    run: async (world) => {
      const { id } = await givenPrompt(world, "cli-push");

      const pushed = await cli(world, [
        "push",
        id,
        "Answer {{customer_name}} politely.",
        "-m",
        "from the cli",
      ]);

      equals("push exits cleanly", pushed.code, 0);
      contains("reports the new version", pushed.stderr, id);

      const read = await cli(world, ["get", id, "--at", pushedVersion(pushed)]);
      equals("get exits cleanly", read.code, 0);
      contains("content is on stdout", read.stdout, "Answer");
    },
  },
  {
    name: "cli: push reads content from stdin",
    run: async (world) => {
      const { id } = await givenPrompt(world, "cli-stdin");

      const pushed = await cli(
        world,
        ["push", id, "-"],
        "Body delivered over stdin."
      );
      equals("push exits cleanly", pushed.code, 0);

      const read = await cli(world, ["get", id, "--at", pushedVersion(pushed)]);
      contains("stdin content is live", read.stdout, "stdin");
    },
  },
  {
    name: "cli: list prints rows on stdout so they can be piped",
    run: async (world) => {
      const { id } = await givenPrompt(world, "cli-list");

      const listed = await cli(world, ["list"]);

      equals("list exits cleanly", listed.code, 0);
      contains("includes the prompt", listed.stdout, id);
    },
  },
  {
    name: "cli: promote points a channel and get --channel follows it",
    run: async (world) => {
      const { id } = await givenPrompt(world, "cli-promote", {
        versions: ["promoted body"],
      });

      const versions = await cli(world, ["versions", id]);
      equals("versions exits cleanly", versions.code, 0);

      const history = JSON.parse(versions.stdout) as readonly {
        readonly version: number;
      }[];
      const latest = history[0]?.version ?? 1;

      const promoted = await cli(world, [
        "promote",
        id,
        "--to",
        "production",
        "--at",
        String(latest),
      ]);
      equals("promote exits cleanly", promoted.code, 0);

      const read = await cli(world, ["get", id, "--channel", "production"]);
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
      const { id } = await givenPrompt(world, "cli-json");

      const read = await cli(world, ["get", id, "--json"]);
      equals("exits cleanly", read.code, 0);

      const prompt = JSON.parse(read.stdout) as {
        readonly id: string;
        readonly version: number;
      };
      equals("id round trips", prompt.id, id);
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
      const { id } = await givenPrompt(world, "cli-pinned", {
        content: "the first body",
        versions: ["the second body"],
      });

      const pinned = await cli(world, ["get", id, "--at", "1", "--json"]);
      equals("exits cleanly", pinned.code, 0);

      const prompt = JSON.parse(pinned.stdout) as {
        readonly content: string;
        readonly version: number;
      };
      equals("serves the first version", prompt.version, 1);
      contains("with the first body", prompt.content, "first");
    },
  },
  {
    name: "cli: gen writes declarations naming each prompt's variables",
    run: async (world) => {
      const { id } = await givenPrompt(world, "cli-variables", {
        content: "Hello {{ customer_name }}, from {{product}}.",
      });

      const generated = await cli(world, ["gen", "--out", "gen.d.ts"]);
      equals("gen exits cleanly", generated.code, 0);

      const written = declarations(world, "gen.d.ts");

      contains("augments the sdk", written, 'import "anpord"');
      contains("declares the registry", written, "AnpordPromptVariables");
      contains("includes the prompt", written, id);
      contains("names a spaced variable", written, "customer_name");
      contains("names the other variable", written, "product");
    },
  },
  {
    name: "cli: generate is the same command under a longer name",
    run: async (world) => {
      await givenPrompt(world, "cli-both-commands");

      const short = await cli(world, ["gen", "--out", "short.d.ts"]);
      const long = await cli(world, ["generate", "--out", "long.d.ts"]);

      equals("gen exits cleanly", short.code, 0);
      equals("generate exits cleanly", long.code, 0);
      equals(
        "both commands agree",
        declarations(world, "long.d.ts"),
        declarations(world, "short.d.ts")
      );
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
