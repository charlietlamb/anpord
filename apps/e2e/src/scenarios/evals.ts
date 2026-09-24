import { Anpord } from "anpord";
import { cli } from "../harness/cli";
import { contains, equals, isTrue, rejects } from "../harness/expect";
import { batchIdIn, givenSuite } from "../harness/given-suite";
import type { Scenario } from "../harness/run";
import type { World } from "../world";

const client = (world: World, key = world.writeKey.key) =>
  new Anpord({ apiKey: key, baseUrl: world.baseUrl });

const withClient = async (
  world: World,
  use: (anpord: Anpord) => Promise<void>,
  key?: string
) => {
  const anpord = client(world, key);

  try {
    await use(anpord);
  } finally {
    await anpord.dispose();
  }
};

const printed = (ran: { readonly stderr: string; readonly stdout: string }) =>
  `${ran.stdout}${ran.stderr}`;

const messageOf = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

export const evalScenarios: readonly Scenario<World>[] = [
  {
    name: "evals: --local runs a case on every variant, one run each",
    run: async (world) => {
      const suite = givenSuite(
        world,
        "e2e-every-variant",
        [{ id: "writes-done", writes: "done.txt" }],
        ["probe-a", "probe-b"]
      );

      const ran = await cli(world, ["eval", suite.file, "--local"]);
      equals("the gate passes", ran.code, 0);
      contains("names the first variant", printed(ran), "command/probe-a");
      contains("names the second variant", printed(ran), "command/probe-b");

      await withClient(world, async (anpord) => {
        const batch = await anpord.evals.batches.get({
          id: batchIdIn(printed(ran)),
        });
        equals("one run per variant", batch.runs.length, 2);
        equals(
          "each run is on its own variant",
          new Set(batch.runs.map((run) => run.variant.model)).size,
          2
        );
        isTrue(
          "every run passed",
          batch.runs.every((run) => run.distribution.passed === 1),
          JSON.stringify(batch.runs.map((run) => run.distribution))
        );
      });
    },
  },
  {
    name: "evals: a case reads back with its suite, variants and runs",
    run: async (world) => {
      const suite = givenSuite(
        world,
        "e2e-reads",
        [{ id: "reads-back", writes: "done.txt" }],
        ["probe-a", "probe-b"]
      );
      equals(
        "the suite runs",
        (await cli(world, ["eval", suite.file, "--local"])).code,
        0
      );

      await withClient(world, async (anpord) => {
        const listed = await anpord.evals.cases.list({ suite: suite.id });
        equals(
          "the suite holds the case",
          listed.cases.map((subject) => subject.id).join(),
          "reads-back"
        );

        const detail = await anpord.evals.cases.get({ id: "reads-back" });
        equals("the case knows its suite", detail.suite.id, suite.id);
        equals("the name defaults to the id", detail.name, "reads-back");
        equals("the case has both variants", detail.variants.length, 2);

        const runs = await anpord.evals.runs.list({ caseId: "reads-back" });
        equals("one run per variant", runs.runs.length, 2);

        const [first] = runs.runs;
        const run = await anpord.evals.runs.get({ id: first?.id ?? "" });
        equals("the run holds its trial", run.trials.length, 1);
        equals("the run is the case's", run.case.id, "reads-back");
      });
    },
  },
  {
    name: "evals: a failing check exits 2 and names the case and variant",
    run: async (world) => {
      const suite = givenSuite(
        world,
        "e2e-failing",
        [
          { id: "passes", writes: "done.txt" },
          { id: "never-writes", writes: "missing.txt" },
        ],
        ["probe-a"]
      );

      const ran = await cli(world, ["eval", suite.file, "--local"]);
      equals("a gate failure exits 2", ran.code, 2);
      contains(
        "names the case and variant that failed",
        printed(ran),
        "never-writes on command/probe-a"
      );
    },
  },
  {
    name: "evals: --case and --variant pick one run out of the file",
    run: async (world) => {
      const suite = givenSuite(
        world,
        "e2e-picked",
        [
          { id: "picked", writes: "done.txt" },
          { id: "skipped", writes: "done.txt" },
        ],
        ["probe-a", "probe-b"]
      );

      const ran = await cli(world, [
        "eval",
        suite.file,
        "--local",
        "--case",
        "picked",
        "--variant",
        "command/probe-b",
      ]);
      equals("the picked run passes", ran.code, 0);

      await withClient(world, async (anpord) => {
        const batch = await anpord.evals.batches.get({
          id: batchIdIn(printed(ran)),
        });
        equals("only one run started", batch.runs.length, 1);
        equals("it is the picked case", batch.runs[0]?.case.id, "picked");
        equals(
          "on the picked variant",
          batch.runs[0]?.variant.model,
          "probe-b"
        );
      });
    },
  },
  {
    name: "evals: a case or variant the file lacks is named, not guessed",
    run: async (world) => {
      const suite = givenSuite(
        world,
        "e2e-unknown",
        [{ id: "known", writes: "done.txt" }],
        ["probe-a"]
      );

      const missingCase = await cli(world, [
        "eval",
        suite.file,
        "--local",
        "--case",
        "unknown",
      ]);
      equals("an unknown case is an error", missingCase.code, 1);
      contains("lists the cases it has", missingCase.stderr, "It has known.");

      const missingVariant = await cli(world, [
        "eval",
        suite.file,
        "--local",
        "--variant",
        "codex/nope",
      ]);
      equals("an unknown variant is an error", missingVariant.code, 1);
      contains(
        "lists the variants it has",
        missingVariant.stderr,
        "command/probe-a"
      );
    },
  },
  {
    name: "evals: the public api refuses the local sandbox",
    run: async (world) => {
      await withClient(world, async (anpord) => {
        const refused = await rejects("a local batch is refused", () =>
          anpord.evals.batches.start({
            cases: [{ id: "a-case", verify: "true" }],
            suite: { id: "e2e-public-local", prompt: "Write done.txt." },
            trials: 1,
            variants: [
              { harness: "codex", model: "gpt-5.6-sol", sandbox: "local" },
            ],
          })
        );
        contains(
          "points at the CLI",
          messageOf(refused),
          "anpord eval --local"
        );
      });
    },
  },
  {
    name: "evals: a local case is not rerun on hosted infrastructure",
    run: async (world) => {
      const suite = givenSuite(
        world,
        "e2e-rerun",
        [{ id: "reruns", writes: "done.txt" }],
        ["probe-a"]
      );
      equals(
        "the suite runs",
        (await cli(world, ["eval", suite.file, "--local"])).code,
        0
      );

      await withClient(world, async (anpord) => {
        const refused = await rejects("the rerun is refused", () =>
          anpord.evals.cases.run({ id: "reruns" })
        );
        contains(
          "says where it can run",
          messageOf(refused),
          "can only be repeated from its own machine"
        );
      });
    },
  },
  {
    name: "evals: one organization cannot read another's batch",
    run: async (world) => {
      const suite = givenSuite(
        world,
        "e2e-tenant",
        [{ id: "private", writes: "done.txt" }],
        ["probe-a"]
      );
      const ran = await cli(world, ["eval", suite.file, "--local"]);
      equals("the suite runs", ran.code, 0);

      await withClient(
        world,
        async (anpord) => {
          await rejects("another organization is refused", () =>
            anpord.evals.batches.get({ id: batchIdIn(printed(ran)) })
          );
        },
        world.otherKey.key
      );
    },
  },
];
