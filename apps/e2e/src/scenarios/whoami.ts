import { cli } from "../harness/cli";
import { contains, equals, isTrue } from "../harness/expect";
import { givenSuite } from "../harness/given-suite";
import type { Scenario } from "../harness/run";
import type { World } from "../world";

const KEY_START_LENGTH = 8;

const asOther = (world: World): World => ({
  ...world,
  writeKey: world.otherKey,
});

export const whoamiScenarios: readonly Scenario<World>[] = [
  {
    name: "whoami: names the organization and key, one fact per line",
    run: async (world) => {
      const ran = await cli(world, ["whoami"]);
      equals("whoami exits cleanly", ran.code, 0);

      const lines = ran.stdout.trimEnd().split("\n");
      equals(
        "the organization facts",
        lines.slice(0, 3).join("\n"),
        [
          "organization       acme org",
          "organization slug  acme",
          `organization id    ${world.writeKey.organizationId}`,
        ].join("\n")
      );
      contains(
        "the key by the name it was minted with",
        lines[3] ?? "",
        `key                ${world.writeKey.name}-`
      );
      equals(
        "the key by its first characters",
        lines[4],
        `key starts with    ${world.writeKey.key.slice(0, KEY_START_LENGTH)}`
      );
      contains("permissions come last", lines[5] ?? "", "permissions");
      isTrue(
        "the secret is never printed",
        !`${ran.stdout}${ran.stderr}`.includes(world.writeKey.key),
        "the key appeared in the output"
      );
    },
  },
  {
    name: "whoami: --json carries the same facts",
    run: async (world) => {
      const ran = await cli(world, ["whoami", "--json"]);
      equals("whoami exits cleanly", ran.code, 0);

      const parsed = JSON.parse(ran.stdout) as {
        readonly credential: { readonly kind: string; readonly name: string };
        readonly organization: { readonly id: string; readonly slug: string };
      };
      equals(
        "organization id",
        parsed.organization.id,
        world.writeKey.organizationId
      );
      equals("organization slug", parsed.organization.slug, "acme");
      equals("credential kind", parsed.credential.kind, "apiKey");
      contains("key name", parsed.credential.name, `${world.writeKey.name}-`);
    },
  },
  {
    name: "whoami: another organization's key names that organization",
    run: async (world) => {
      const ran = await cli(asOther(world), ["whoami", "--json"]);
      equals("whoami exits cleanly", ran.code, 0);

      const parsed = JSON.parse(ran.stdout) as {
        readonly organization: { readonly id: string; readonly slug: string };
      };
      equals(
        "organization id",
        parsed.organization.id,
        world.otherKey.organizationId
      );
      equals("organization slug", parsed.organization.slug, "globex");
    },
  },
  {
    name: "whoami: an eval says once which organization its runs land in",
    run: async (world) => {
      const suite = givenSuite(
        world,
        "e2e-runs-land-in",
        [{ id: "writes-done", writes: "done.txt" }],
        ["probe"]
      );

      const ran = await cli(world, ["eval", suite.file, "--local"]);
      equals("the gate passes", ran.code, 0);

      const announcements = ran.stderr
        .split("\n")
        .filter((line) => line.startsWith("Runs land in"));
      equals(
        "announced once",
        announcements.join("\n"),
        "Runs land in acme org (acme)."
      );
      isTrue(
        "announced before the batch link",
        ran.stderr.indexOf("Runs land in") < ran.stderr.indexOf("/evals/"),
        ran.stderr
      );
    },
  },
];
