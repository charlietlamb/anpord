import { afterAll, describe, expect, it } from "bun:test";
import { Effect } from "effect";
import {
  collect,
  exitOf,
  outputOf,
  streamOf,
  WORKSPACE,
  withSandbox,
} from "./harness";
import { PROVIDERS, type ProviderUnderTest } from "./providers";
import { reportCoverage } from "./summary";

const GAP_SECONDS = 3;
const TOLERANCE_MS = 500;

const commands = (provider: ProviderUnderTest) => {
  const minutes = (provider.slowSeconds + 120) * 1000;

  describe(`${provider.name} runs commands`, () => {
    it(
      "reports a zero exit code",
      async () => {
        const chunks = await withSandbox(provider.adapter, (sandbox) =>
          collect(sandbox.exec("echo ready"))
        );

        expect(outputOf(chunks)).toContain("ready");
        expect(exitOf(chunks)).toBe(0);
      },
      minutes
    );

    it(
      "reports a non-zero exit code rather than swallowing it",
      async () => {
        const chunks = await withSandbox(provider.adapter, (sandbox) =>
          collect(sandbox.exec("echo failing; exit 7"))
        );

        expect(outputOf(chunks)).toContain("failing");
        expect(exitOf(chunks)).toBe(7);
      },
      minutes
    );

    it(
      "distinguishes stdout from stderr",
      async () => {
        const chunks = await withSandbox(provider.adapter, (sandbox) =>
          collect(sandbox.exec("echo to-out; echo to-err >&2"))
        );

        expect(streamOf(chunks, "stdout")).toContain("to-out");
        expect(streamOf(chunks, "stdout")).not.toContain("to-err");
        expect(streamOf(chunks, "stderr")).toContain("to-err");
        expect(exitOf(chunks)).toBe(0);
      },
      minutes
    );

    /* The behaviour the old streaming-conformance test proved, folded in: a
       provider that only hands back the whole log at the end makes a
       half-hour command look like a hang. */
    it(
      "delivers output as it is produced, not only at the end",
      async () => {
        const chunks = await withSandbox(provider.adapter, (sandbox) =>
          collect(
            sandbox.exec(`echo first; sleep ${GAP_SECONDS}; echo second`, {
              timeoutMs: minutes,
            })
          )
        );

        const output = chunks.filter((chunk) => chunk.stream !== "exit");

        expect(output.length).toBeGreaterThan(0);
        expect(outputOf(chunks)).toContain("first");
        expect(outputOf(chunks)).toContain("second");

        const first = Math.min(...output.map((chunk) => chunk.at));
        const last = Math.max(...output.map((chunk) => chunk.at));

        expect(last - first).toBeGreaterThanOrEqual(
          GAP_SECONDS * 1000 - TOLERANCE_MS
        );
      },
      minutes
    );

    it(
      "waits for a command that goes quiet before it finishes",
      async () => {
        const chunks = await withSandbox(provider.adapter, (sandbox) =>
          collect(
            sandbox.exec(
              `echo working; sleep ${provider.slowSeconds}; echo done`,
              {
                timeoutMs: minutes,
              }
            )
          )
        );

        expect(outputOf(chunks)).toContain("done");
        expect(chunks.at(-1)?.stream).toBe("exit");
        expect(exitOf(chunks)).toBe(0);
      },
      minutes
    );

    it(
      "honours the env a caller asked for",
      async () => {
        const chunks = await withSandbox(provider.adapter, (sandbox) =>
          collect(
            sandbox.exec('echo "[$ANPORD_WANTED]"', {
              env: { ANPORD_WANTED: "visible" },
            })
          )
        );

        expect(outputOf(chunks)).toContain("[visible]");
        expect(exitOf(chunks)).toBe(0);
      },
      minutes
    );

    it(
      "honours the cwd a caller asked for",
      async () => {
        const output = await withSandbox(provider.adapter, (sandbox) =>
          Effect.gen(function* () {
            yield* sandbox.writeFile(
              `${WORKSPACE}/here/marker.txt`,
              "found me"
            );

            return outputOf(
              yield* collect(
                sandbox.exec("cat marker.txt", { cwd: `${WORKSPACE}/here` })
              )
            );
          })
        );

        expect(output).toContain("found me");
      },
      minutes
    );

    /* Either shape is honest: the provider kills the command and reports a
       non-zero exit, or it fails the stream. Reporting success is not. */
    it(
      "reports a command that outlives its timeout as failed",
      async () => {
        const outcome = await withSandbox(provider.adapter, (sandbox) =>
          collect(sandbox.exec("sleep 60", { timeoutMs: 2000 })).pipe(
            Effect.either
          )
        );

        if (outcome._tag === "Right") {
          expect(exitOf(outcome.right)).not.toBe(0);
          return;
        }

        expect(outcome.left).toBeDefined();
      },
      minutes
    );
  });
};

afterAll(reportCoverage);

for (const provider of PROVIDERS) {
  if (provider.credentialled) {
    commands(provider);
    continue;
  }

  describe.skip(`${provider.name} runs commands (needs ${provider.needs})`, () => {
    it("was not exercised", () => {
      expect(provider.credentialled).toBe(false);
    });
  });
}
