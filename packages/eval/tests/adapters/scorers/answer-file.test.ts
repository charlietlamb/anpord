import { describe, expect, test } from "bun:test";
import { Effect, Stream } from "effect";
import { ScorerGroundTruthLive } from "../../../src/adapters/scorers/ground-truth";
import { ANSWER_PATH, TRANSCRIPT_PATH } from "../../../src/domain/answer-file";
import type { HarnessEvent } from "../../../src/domain/harness-event";
import type { ExecOptions, SandboxHandle } from "../../../src/ports/sandbox";
import { Scorer } from "../../../src/ports/scorer";
import { declinesEverything } from "../../fixtures/declines-everything";
import { exit } from "../../fixtures/exec-chunk";

const HOME = "/home/agent";

interface Written {
  readonly content: string;
  readonly path: string;
}

const recording = () => {
  const steps: string[] = [];
  const env: (Readonly<Record<string, string>> | undefined)[] = [];
  const written: Written[] = [];

  const sandbox: SandboxHandle = {
    exec: (command: string, options?: ExecOptions) => {
      steps.push(`exec ${command}`);
      env.push(options?.env);

      return Stream.fromIterable([exit(0)]);
    },
    home: HOME,
    id: "sbx-1",
    provider: "daytona",
    ...declinesEverything,
    writeFile: (path: string, content: string) =>
      Effect.sync(() => {
        steps.push(`write ${path}`);
        written.push({ content, path });
      }),
  };

  return { env, sandbox, steps, written };
};

const score = (
  sandbox: SandboxHandle,
  events: readonly HarnessEvent[],
  verifyCommand: string | null,
  validator?: { readonly name: string; readonly source: string }
) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const scorer = yield* Scorer;

      return yield* scorer.score({
        commandCount: 1,
        events,
        modelMs: 1,
        sandbox,
        validator,
        verifyCommand,
        workspace: "/tmp/w",
      });
    }).pipe(Effect.provide(ScorerGroundTruthLive))
  );

const spoken: readonly HarnessEvent[] = [
  { _tag: "Message", role: "assistant", text: "Checking." },
  { _tag: "Command", command: "ls", exitCode: 0, output: "" },
  { _tag: "Message", role: "user", text: "and?" },
  { _tag: "Message", role: "assistant", text: "There are eight." },
];

const contentAt = (written: readonly Written[], path: string) =>
  written.find((entry) => entry.path === path)?.content;

const indexOf = (steps: readonly string[], fragment: string) =>
  steps.findIndex((step) => step.includes(fragment));

describe("the answer a verifier is given", () => {
  test("is written before the verify command runs", async () => {
    const { sandbox, steps, written } = recording();

    await score(sandbox, spoken, "test -f a");

    expect(indexOf(steps, `write ${ANSWER_PATH(HOME)}`)).toBeLessThan(
      indexOf(steps, "exec")
    );
    expect(contentAt(written, ANSWER_PATH(HOME))).toBe("There are eight.");
  });

  test("is written before a validator runs", async () => {
    const { sandbox, steps, written } = recording();

    await score(sandbox, spoken, null, { name: "v", source: "source" });

    expect(indexOf(steps, `write ${ANSWER_PATH(HOME)}`)).toBeLessThan(
      indexOf(steps, "exec node")
    );
    expect(contentAt(written, ANSWER_PATH(HOME))).toBe("There are eight.");
  });

  test("carries every assistant turn in the transcript", async () => {
    const { sandbox, written } = recording();

    await score(sandbox, spoken, "test -f a");

    expect(contentAt(written, TRANSCRIPT_PATH(HOME))).toBe(
      "Checking.\n\nThere are eight."
    );
  });

  /* An absent file and an empty one read the same to a validator only if both
     are always written, which is why silence still produces two files. */
  test("is still written when the agent said nothing", async () => {
    const { sandbox, written } = recording();

    await score(sandbox, [], "test -f a");

    expect(contentAt(written, ANSWER_PATH(HOME))).toBe("");
    expect(contentAt(written, TRANSCRIPT_PATH(HOME))).toBe("");
  });

  /* Under the home, so a case free to assert on a clean git status or on a
     fixture diff never sees the reply it was scored on. */
  test("lands outside the workspace", async () => {
    const { sandbox, written } = recording();

    await score(sandbox, spoken, "test -f a");

    for (const entry of written) {
      expect(entry.path.startsWith(`${HOME}/`)).toBe(true);
      expect(entry.path.startsWith("/tmp/w")).toBe(false);
    }
  });
});

describe("where a verifier is told to look", () => {
  test("is named on the verify command's environment", async () => {
    const { env, sandbox } = recording();

    await score(sandbox, spoken, "test -f a");

    expect(env[0]).toMatchObject({
      ANPORD_ANSWER_FILE: ANSWER_PATH(HOME),
      ANPORD_TRANSCRIPT_FILE: TRANSCRIPT_PATH(HOME),
    });
  });

  test("is named on a validator's environment, beside the prepare value", async () => {
    const { env, sandbox } = recording();

    await score(sandbox, spoken, null, { name: "v", source: "source" });

    expect(env[0]).toMatchObject({
      ANPORD_ANSWER_FILE: ANSWER_PATH(HOME),
      ANPORD_PREPARE_VALUE: "{}",
      ANPORD_TRANSCRIPT_FILE: TRANSCRIPT_PATH(HOME),
    });
  });
});
